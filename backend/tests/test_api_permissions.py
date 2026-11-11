"""P05 permissions, handoff capability and exact-key ownership regressions."""
import asyncio
import copy
from datetime import datetime, timezone
import os
import threading
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

from fastapi import HTTPException
import pytest

from services.api_permissions import ACTIVE_SCOPES, OPERATIONS, permits, require_operation, validate_scopes


@pytest.mark.parametrize("operation,required", list(OPERATIONS.items()))
@pytest.mark.parametrize("scope", ACTIVE_SCOPES)
def test_permissions_never_imply_another_permission(operation, required, scope):
    assert permits({"scopes": [scope]}, operation) is (scope == required)


@pytest.mark.parametrize("scopes", [None, [], "deed:create", {"deed:create": True}, ["*"], ["unknown"]])
def test_legacy_or_malformed_scopes_do_not_grant_operations(scopes):
    for operation in OPERATIONS:
        with pytest.raises(HTTPException) as denied:
            require_operation({"scopes": scopes}, operation)
        assert denied.value.status_code == 403
        assert denied.value.detail["code"] == "INSUFFICIENT_SCOPE"


@pytest.mark.parametrize("scopes", [None, "deed:read", ["*"], ["deed:evidence"], ["usage:read"],
    ["deed:read", "deed:read"], [" deed:read"], ["DEED:READ"], [None], [1]])
def test_issuance_rejects_unknown_reserved_duplicate_and_coerced_scopes(scopes):
    with pytest.raises(HTTPException) as denied:
        validate_scopes(scopes)
    assert denied.value.status_code == 422


def test_explicit_empty_grant_is_not_a_default_grant():
    assert validate_scopes([]) == []
    with pytest.raises(HTTPException):
        require_operation({"scopes": list(ACTIVE_SCOPES)}, "future.operation")


def test_response_projection_hides_handoff_without_grant():
    from routers.api_v1.router import _deed_response_from_row
    row={'deed_id':'synthetic','document_id':'DOC-SYNTHETIC','status':'pending_confirmation',
         'deed_type':'grant_deed','created_at':datetime.now(timezone.utc),
         'confirmation_token':'synthetic-not-a-real-token','property_address':'Synthetic',
         'property_apn':'Synthetic','property_county':'Synthetic','grantor_name':'Synthetic',
         'grantee_name':'Synthetic','transfer_tax_amount':0,'transfer_tax_exempt':True}
    assert _deed_response_from_row(row,{'scopes':['deed:read']}).data.urls.confirmation is None
    assert _deed_response_from_row(row,{'scopes':['deed:handoff']}).data.urls.confirmation


@pytest.mark.parametrize("operation", ["create", "read", "list", "pdf", "calculate"])
def test_internal_call_is_denied_before_database_or_render(monkeypatch, operation):
    from routers.api_v1 import router as api
    database = Mock(side_effect=AssertionError("unauthorized database access"))
    renderer = Mock(side_effect=AssertionError("unauthorized rendering"))
    monkeypatch.setattr(api, "get_db_connection", database)
    monkeypatch.setattr(api, "render_deed_html", renderer)
    key = {"scopes": []}
    calls = {
        "create": lambda: api.create_deed(None, None, key, None),
        "read": lambda: api.get_deed(None, "fixture", key),
        "list": lambda: api.list_deeds(None, api_key=key),
        "pdf": lambda: api.download_deed_pdf(None, "fixture", key),
        "calculate": lambda: api.calculate_transfer_tax(None, key),
    }
    with pytest.raises(HTTPException) as denied:
        asyncio.run(calls[operation]())
    assert denied.value.status_code == 403
    database.assert_not_called()
    renderer.assert_not_called()


def test_route_inventory_requires_no_unclassified_partner_operation():
    from routers.api_v1.router import router
    paths = {(next(iter(route.methods)), route.path) for route in router.routes}
    assert paths == {
        ("POST", "/api/v1/deeds"), ("GET", "/api/v1/deeds"),
        ("GET", "/api/v1/deeds/{deed_id}"), ("GET", "/api/v1/deeds/{deed_id}/pdf"),
        ("POST", "/api/v1/transfer-tax/calculate"),
        ("GET", "/api/v1/verify/{document_id}"), ("GET", "/api/v1/openapi.json"),
    }


def test_demo_internal_caller_cannot_skip_handoff_authorization(monkeypatch):
    from unittest.mock import AsyncMock
    from starlette.requests import Request
    from routers import try_demo
    from routers.api_v1 import router as api
    monkeypatch.setenv(try_demo.DEMO_KEY_ENV, 'synthetic-unit-fixture-not-a-service-key')
    monkeypatch.setattr(try_demo, 'throttle', lambda *a, **k: None)
    async def create_only_context(*args):
        return {'scopes':['deed:create']}
    monkeypatch.setattr(api, 'get_api_key', create_only_context)
    create = AsyncMock(side_effect=AssertionError('demo create reached without handoff permission'))
    monkeypatch.setattr(api, 'create_deed', create)
    request=Request({'type':'http','method':'POST','path':'/try/deed','headers':[],
                     'client':('127.0.0.1',12345)})
    with pytest.raises(HTTPException) as denied:
        asyncio.run(try_demo.try_deed(try_demo.TryRequest(approver_name='Synthetic'), request))
    assert denied.value.status_code==403
    create.assert_not_called()


@pytest.fixture(scope="module")
def db_client():
    if not os.getenv("DATABASE_URL"):
        pytest.skip("test database required")
    import database
    for worker in threading.enumerate():
        if worker.name == "schema-convergence":
            worker.join(30)
            assert not worker.is_alive()
    from fastapi.testclient import TestClient
    from main import app
    assert not app.dependency_overrides
    return TestClient(app)


def sql(statement, params=(), *, one=False):
    import psycopg2
    from psycopg2.extras import RealDictCursor
    with psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor) as conn, conn.cursor() as cur:
        cur.execute(statement, params)
        return cur.fetchone() if one else None


@pytest.fixture
def admin_headers(db_client):
    from auth import create_access_token
    email = "p05-" + uuid4().hex + "@example.invalid"
    user = sql("INSERT INTO users(email,role) VALUES (%s,'admin') RETURNING id", (email,), one=True)
    return {"Authorization": "Bearer " + create_access_token({"sub": str(user['id']), "email": email, "role": "admin"})}


@pytest.fixture
def mint(db_client, admin_headers):
    def issue(scopes, *, is_test=True):
        response = db_client.post("/admin/api-keys", headers=admin_headers, json={
            "name": "p05-fixture-" + uuid4().hex, "is_test": is_test, "scopes": scopes})
        assert response.status_code == 200, response.status_code
        return response.json()["api_key"]
    return issue


def header(key):
    return {"Authorization": "Bearer " + key['key']}


@pytest.fixture
def draft_body():
    from schemas.api_v1.deeds import CreateDeedRequest
    body = copy.deepcopy(CreateDeedRequest.model_config['json_schema_extra']['example'])
    body['approver']['email'] = "p05-synthetic@example.invalid"
    return body


@pytest.fixture
def rendering(monkeypatch):
    from routers.api_v1 import router as api
    calls = []
    async def render(html):
        calls.append(html)
        return b"%PDF-1.4\nP05 authorization fixture only\n%%EOF"
    monkeypatch.setattr(api, "render_pdf_async", render)
    return calls


@pytest.mark.parametrize("legacy_scopes", [None, [], ["unknown"], ["deed:read"]])
def test_real_dependency_denies_create_before_persistence(db_client, mint, draft_body, rendering, legacy_scopes):
    key = mint([])
    sql("UPDATE api_keys SET scopes=%s WHERE id=%s", (legacy_scopes, key['id']))
    before = sql("SELECT COUNT(*) AS n FROM api_deeds WHERE api_key_id=%s", (key['id'],), one=True)['n']
    response = db_client.post("/api/v1/deeds", headers=header(key), json=draft_body)
    assert response.status_code == 403
    assert response.json()['detail']['code'] == 'INSUFFICIENT_SCOPE'
    assert not rendering
    assert sql("SELECT COUNT(*) AS n FROM api_deeds WHERE api_key_id=%s", (key['id'],), one=True)['n'] == before


def test_read_only_never_discloses_handoff_or_pdf(db_client, mint, draft_body, rendering):
    key = mint(["deed:create", "deed:read", "deed:handoff"])
    made = db_client.post('/api/v1/deeds', headers=header(key), json=draft_body)
    assert made.status_code == 200
    data = made.json()['data']
    assert data['urls']['confirmation']
    sql("UPDATE api_keys SET scopes=ARRAY['deed:read'] WHERE id=%s", (key['id'],))
    read = db_client.get('/api/v1/deeds/' + data['deed_id'], headers=header(key))
    assert read.status_code == 200
    assert read.json()['data']['urls']['confirmation'] is None
    assert data['deed_id'] in [row['deed_id'] for row in db_client.get('/api/v1/deeds', headers=header(key)).json()['data']['deeds']]
    assert db_client.get('/api/v1/deeds/'+data['deed_id']+'/pdf',headers=header(key)).status_code == 403
    assert db_client.post('/api/v1/transfer-tax/calculate', headers=header(key), json={'value': 500000, 'county':'Los Angeles'}).status_code == 403


def test_create_replay_and_retrieve_share_handoff_gate(db_client, mint, draft_body, rendering):
    key=mint(['deed:create','deed:read'])
    headers={**header(key),'Idempotency-Key':uuid4().hex}
    first=db_client.post('/api/v1/deeds',headers=headers,json=draft_body)
    replay=db_client.post('/api/v1/deeds',headers=headers,json=draft_body)
    assert first.status_code == replay.status_code == 200
    data=first.json()['data']
    assert data['urls']['confirmation'] is None
    assert replay.json()['data']['urls']['confirmation'] is None
    original=sql('SELECT preview_pdf_data,request_snapshot_sha256 FROM api_deeds WHERE deed_id=%s',(data['deed_id'],),one=True)
    sql('UPDATE api_keys SET scopes=%s WHERE id=%s',(['deed:create','deed:read','deed:handoff'],key['id']))
    disclosed=db_client.post('/api/v1/deeds',headers=headers,json=draft_body)
    read=db_client.get('/api/v1/deeds/'+data['deed_id'],headers=header(key))
    assert disclosed.json()['data']['deed_id']==data['deed_id']
    assert disclosed.json()['data']['urls']['confirmation']==read.json()['data']['urls']['confirmation']
    assert read.json()['data']['urls']['confirmation']
    assert sql('SELECT preview_pdf_data,request_snapshot_sha256 FROM api_deeds WHERE deed_id=%s',(data['deed_id'],),one=True)==original
    assert len(rendering)==1


@pytest.mark.parametrize('same_org',[None,987654])
def test_same_org_replacement_and_other_environment_do_not_inherit(db_client,mint,draft_body,rendering,same_org):
    owner=mint(list(ACTIVE_SCOPES))
    other=mint(list(ACTIVE_SCOPES),is_test=False)
    sql('UPDATE api_keys SET organization_id=%s WHERE id IN (%s,%s)',(same_org,owner['id'],other['id']))
    made=db_client.post('/api/v1/deeds',headers=header(owner),json=draft_body).json()['data']
    token=made['urls']['confirmation'].rsplit('/',1)[-1]
    assert db_client.post('/confirm/'+token+'/approve').status_code==200
    assert db_client.get('/api/v1/deeds/'+made['deed_id']+'/pdf',headers=header(owner)).status_code==200
    for suffix in ('','/pdf'):
        assert db_client.get('/api/v1/deeds/'+made['deed_id']+suffix,headers=header(other)).status_code==404
    assert not db_client.get('/api/v1/deeds',headers=header(other)).json()['data']['deeds']


def test_pause_resume_terminal_revoke_and_existing_handoff(db_client,mint,admin_headers,draft_body,rendering):
    key=mint(list(ACTIVE_SCOPES))
    made=db_client.post('/api/v1/deeds',headers=header(key),json=draft_body).json()['data']
    token=made['urls']['confirmation'].rsplit('/',1)[-1]
    path='/admin/api-keys/'+key['id']
    assert db_client.patch(path,headers=admin_headers,json={'is_active':False}).status_code==200
    assert db_client.get('/api/v1/deeds',headers=header(key)).status_code==403
    assert db_client.patch(path,headers=admin_headers,json={'is_active':True}).status_code==200
    assert db_client.get('/api/v1/deeds',headers=header(key)).status_code==200
    assert db_client.delete(path,headers=admin_headers).status_code==200
    stamp=sql('SELECT revoked_at FROM api_keys WHERE id=%s',(key['id'],),one=True)['revoked_at']
    assert stamp is not None
    assert db_client.delete(path,headers=admin_headers).status_code==200
    assert sql('SELECT revoked_at FROM api_keys WHERE id=%s',(key['id'],),one=True)['revoked_at']==stamp
    assert db_client.patch(path,headers=admin_headers,json={'is_active':True}).status_code==409
    assert db_client.get('/api/v1/deeds',headers=header(key)).status_code==403
    assert db_client.post('/confirm/'+token+'/approve').status_code==200
    assert db_client.get('/confirm/'+token+'/artifact').status_code==200


def test_timestamp_alone_revokes_and_issuance_has_no_implicit_default(db_client,mint,admin_headers):
    key=mint(['deed:read'])
    sql('UPDATE api_keys SET revoked_at=NOW(),is_active=true WHERE id=%s',(key['id'],))
    assert db_client.get('/api/v1/deeds',headers=header(key)).status_code==403
    empty=mint([])
    assert sql('SELECT scopes FROM api_keys WHERE id=%s',(empty['id'],),one=True)['scopes']==[]
    assert db_client.get('/api/v1/deeds',headers=header(empty)).status_code==403
    for payload in ({'name':'missing','is_test':True},{'name':'null','scopes':None},{'name':'reserved','scopes':['deed:evidence']}):
        assert db_client.post('/admin/api-keys',headers=admin_headers,json=payload).status_code==422
    assert db_client.patch('/admin/api-keys/'+empty['id'],headers=admin_headers,json={'scopes':['deed:read']}).status_code==200
    assert db_client.get('/api/v1/deeds',headers=header(empty)).status_code==200
    catalog=db_client.get('/admin/api-keys',headers=admin_headers)
    assert catalog.status_code==200
    assert catalog.json()['permissions']['scopes']==list(ACTIVE_SCOPES)
    assert db_client.get('/admin/api-keys',headers=header(empty)).status_code==401


@pytest.mark.parametrize('scopes,allowed_path', [(['tax:calculate'],'calculator'), (['deed:pdf'],'pdf')])
def test_independent_pdf_and_calculator_grants_are_operational(db_client,mint,draft_body,rendering,scopes,allowed_path):
    key=mint(list(ACTIVE_SCOPES))
    made=db_client.post('/api/v1/deeds',headers=header(key),json=draft_body).json()['data']
    token=made['urls']['confirmation'].rsplit('/',1)[-1]
    assert db_client.post('/confirm/'+token+'/approve').status_code==200
    sql('UPDATE api_keys SET scopes=%s WHERE id=%s',(scopes,key['id']))
    assert db_client.get('/api/v1/deeds/'+made['deed_id'],headers=header(key)).status_code==403
    assert db_client.get('/api/v1/deeds',headers=header(key)).status_code==403
    calculator=db_client.post('/api/v1/transfer-tax/calculate',headers=header(key),json={'value':500000,'county':'Los Angeles'})
    pdf=db_client.get('/api/v1/deeds/'+made['deed_id']+'/pdf',headers=header(key))
    assert calculator.status_code==(200 if allowed_path=='calculator' else 403)
    assert pdf.status_code==(200 if allowed_path=='pdf' else 403)


def test_rehearsal_requires_explicit_complete_decisions_and_never_applies():
    from services.api_permission_transition import plan_manifest
    identifiers=[str(uuid4()),str(uuid4())]
    rows=[{'key_id':key,'scopes':None,'is_active':True,'revoked_at':None} for key in identifiers]
    decisions=[{'key_id':key,'approved_scopes':['deed:read'],'owner_reference':'owner-case-1'} for key in identifiers]
    for incomplete in ([],decisions[:1],decisions+[decisions[0]]):
        with pytest.raises(ValueError):
            plan_manifest(rows,incomplete)
    plan=plan_manifest(rows,decisions)
    assert plan['apply_allowed'] is False
    assert plan['customer_ownership_changed'] is False
    assert plan['legacy_behavior_recreated'] is False
    assert all(item['before']['scopes'] is None for item in plan['plan'])
    assert all(item['proposed_scopes']==['deed:read'] for item in plan['plan'])
    with pytest.raises(ValueError):
        plan_manifest([{**rows[0],'name':'shared label'}],decisions[:1])
    with pytest.raises(ValueError):
        plan_manifest(rows,[{**decisions[0],'owner_reference':'person@example.invalid'},decisions[1]])


def test_rehearsal_snapshot_cannot_be_changed_by_the_input_and_revoked_grants_refuse():
    from services.api_permission_transition import plan_manifest
    key=str(uuid4())
    row={'key_id':key,'scopes':['legacy-unknown'],'is_active':True,'revoked_at':None}
    decision={'key_id':key,'approved_scopes':[],'owner_reference':'owner-case-2'}
    result=plan_manifest([row],[decision])
    row['scopes'].clear()
    assert result['plan'][0]['before']['scopes']==['legacy-unknown']
    with pytest.raises(ValueError):
        plan_manifest([{**row,'revoked_at':datetime.now(timezone.utc)}],[{**decision,'approved_scopes':['deed:read']}])


def test_real_inventory_is_aggregate_guarded_and_does_not_boot_schema(db_client):
    import json
    from pathlib import Path
    import subprocess
    import sys
    script=Path(__file__).resolve().parents[1]/'scripts/api_permission_review.py'
    test_env={**os.environ,'EXPECTED_DATABASE':'deedpro_platform_ci'}
    good=subprocess.run([sys.executable,str(script)],env=test_env,capture_output=True,text=True,timeout=30)
    assert good.returncode==0
    data=json.loads(good.stdout)
    assert data['cutover_authorized'] is False
    assert data['manifest_required'] is True
    assert data['counts']['total_keys']>=1
    assert all(isinstance(value,int) for value in data['counts'].values())
    assert 'key_hash' not in good.stdout and 'key_prefix' not in good.stdout
    assert '[schema]' not in good.stdout
    refused=subprocess.run([sys.executable,str(script)],env={**test_env,'EXPECTED_DATABASE':'not-the-test-database'},capture_output=True,text=True,timeout=30)
    assert refused.returncode==1
    assert not refused.stdout.strip()
