import pytest


@pytest.fixture
def service_info():
    return {
        "endpoint": "https://www.titlepoint.com/TitlePointServices/TpsService.asmx",
        "username": "test_user",
        "password": "test_pass",
        "service_type": "Property",
    }


@pytest.fixture
def email():
    return "test@example.com"


@pytest.fixture
def password():
    return "test_pass"


