'use client';

/**
 * The handoff's two-page sample grant deed, rebuilt as HTML.
 *
 * Parties, property and numbers are fictitious. This is not a PDF from
 * the deed engine. The handoff says to replace it with an engine PDF
 * before launch; that replacement is not this change.
 */
export function SampleDeed({ embed = false }: { embed?: boolean }) {
  return (
    <div className={embed ? undefined : 'deed-stack'}>
      {!embed && (
        <div className="mkt-noprint deed-toolbar">
          <span>Sample grant deed. The parties, property and numbers are fictitious.</span>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: '#12141A', color: '#fff', fontWeight: 700, padding: '10px 16px', borderRadius: 6, border: 0 }}
          >
            Save as PDF
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <DeedPage1 />
        {!embed && <DeedPage2 />}
      </div>
    </div>
  );
}

function DeedPage1() {
  return (
    <div className="deed-page" style={{ padding: '0 5.9cqw 4cqw', display: 'flex', flexDirection: 'column', fontSize: '1.62cqw', lineHeight: 1.38 }}>
      <div style={{ height: '29.4cqw', boxSizing: 'border-box', paddingTop: '5.9cqw', display: 'flex' }}>
        <div style={{ width: '41.2cqw', display: 'flex', flexDirection: 'column', gap: '.5cqw', fontSize: '1.42cqw', lineHeight: 1.3 }}>
          <div style={{ fontWeight: 700 }}>RECORDING REQUESTED BY:</div>
          <div>Pacific Coast Escrow</div>
          <div style={{ fontWeight: 700, marginTop: '.9cqw' }}>AND WHEN RECORDED MAIL THIS DEED AND, UNLESS OTHERWISE SHOWN BELOW, MAIL TAX STATEMENTS TO:</div>
          <div style={{ marginTop: '.4cqw', paddingLeft: '2cqw' }}>Robert C. Roe<br />1234 Sycamore Lane<br />Los Angeles, CA 90001</div>
        </div>
      </div>
      <div style={{ borderTop: '.12cqw solid #111', textAlign: 'right', fontSize: '1.05cqw', letterSpacing: '.06em', paddingTop: '.4cqw' }}>SPACE ABOVE THIS LINE FOR RECORDER&apos;S USE</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2cqw', fontSize: '1.42cqw', marginTop: '1.2cqw' }}>
        <span>Title Order No.: TO-88231</span>
        <span>Escrow No.: ESC-44120</span>
        <span>APN: 5432-001-012</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: '3.1cqw', fontWeight: 700, letterSpacing: '.08em', margin: '2.6cqw 0 2cqw' }}>GRANT DEED</div>
      <div style={{ fontSize: '1.42cqw', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '.35cqw' }}>
        <div style={{ fontWeight: 700 }}>THE UNDERSIGNED GRANTOR(S) DECLARE(S):</div>
        <div style={{ paddingLeft: '2cqw' }}>
          DOCUMENTARY TRANSFER TAX IS <span style={{ borderBottom: '.1cqw solid #111', padding: '0 .8cqw' }}>$825.00</span>
          {' '}CITY TRANSFER TAX IS <span style={{ borderBottom: '.1cqw solid #111', padding: '0 .8cqw' }}>$3,375.00</span>
        </div>
        <BoxRow checked>computed on full value of property conveyed, or</BoxRow>
        <BoxRow>computed on full value less value of liens or encumbrances remaining at time of sale.</BoxRow>
        <div style={{ paddingLeft: '2cqw', display: 'flex', alignItems: 'center', gap: '.8cqw', flexWrap: 'wrap' }}>
          <Box />
          <span>Unincorporated area</span>
          <Box checked />
          <span>City of Los Angeles</span>
        </div>
      </div>
      <div style={{ marginTop: '2.4cqw', display: 'flex', flexDirection: 'column', gap: '1.3cqw' }}>
        <div><strong>FOR A VALUABLE CONSIDERATION</strong>, receipt of which is hereby acknowledged,</div>
        <div style={{ fontWeight: 700, paddingLeft: '2cqw' }}>JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE AS JOINT TENANTS</div>
        <div>hereby <strong>GRANT(S)</strong> to</div>
        <div style={{ fontWeight: 700, paddingLeft: '2cqw' }}>ROBERT C. ROE, A SINGLE MAN</div>
        <div>the following described real property in the City of Los Angeles, County of Los Angeles, State of California:</div>
        <div style={{ paddingLeft: '2cqw', textTransform: 'uppercase' }}>Lot 15 in Block 3 of Tract No. 12345, as per map recorded in Book 123, Pages 45 and 46 of Maps, in the office of the County Recorder of said County.</div>
        <div>Commonly known as: 1234 Sycamore Lane, Los Angeles, CA 90001</div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '4cqw' }}>
        <div>Dated: <span style={{ display: 'inline-block', width: '18cqw', borderBottom: '.1cqw solid #111' }} /></div>
        <div style={{ width: '38cqw', display: 'flex', flexDirection: 'column', gap: '3cqw' }}>
          <Sign name="John A. Doe" />
          <Sign name="Jane B. Doe" />
        </div>
      </div>
      <div style={{ marginTop: '2.4cqw', borderTop: '.1cqw solid #111', paddingTop: '.6cqw', textAlign: 'center', fontSize: '1.2cqw', letterSpacing: '.05em' }}>MAIL TAX STATEMENTS AS DIRECTED ABOVE</div>
    </div>
  );
}

function DeedPage2() {
  return (
    <div className="deed-page" style={{ padding: '8cqw 5.9cqw 5cqw', display: 'flex', flexDirection: 'column', gap: '2cqw', fontSize: '1.62cqw', lineHeight: 1.45 }}>
      <div style={{ textAlign: 'center', fontSize: '2.2cqw', fontWeight: 700, letterSpacing: '.06em' }}>ACKNOWLEDGMENT</div>
      <div style={{ border: '.12cqw solid #111', padding: '1.4cqw 1.8cqw', fontSize: '1.42cqw' }}>
        A notary public or other officer completing this certificate verifies only the identity of the individual who signed the document to which this certificate is attached, and not the truthfulness, accuracy, or validity of that document.
      </div>
      <div>State of California</div>
      <div>County of <span style={{ display: 'inline-block', width: '30cqw', borderBottom: '.1cqw solid #111' }} /></div>
      <div style={{ lineHeight: 2.1 }}>
        On <span style={{ display: 'inline-block', width: '20cqw', borderBottom: '.1cqw solid #111' }} /> before me, <span style={{ display: 'inline-block', width: '28cqw', borderBottom: '.1cqw solid #111' }} />, personally appeared <span style={{ display: 'inline-block', width: '40cqw', borderBottom: '.1cqw solid #111' }} />,
      </div>
      <div>who proved to me on the basis of satisfactory evidence to be the person(s) whose name(s) is/are subscribed to the within instrument and acknowledged to me that he/she/they executed the same in his/her/their authorized capacity(ies), and that by his/her/their signature(s) on the instrument the person(s), or the entity upon behalf of which the person(s) acted, executed the instrument.</div>
      <div>I certify under PENALTY OF PERJURY under the laws of the State of California that the foregoing paragraph is true and correct.</div>
      <div>WITNESS my hand and official seal.</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '4cqw', marginTop: '3cqw' }}>
        <div>Signature <span style={{ display: 'inline-block', width: '34cqw', borderBottom: '.1cqw solid #111' }} /></div>
        <div style={{ width: '26cqw', height: '14cqw', border: '.1cqw dashed #6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.42cqw', color: '#4B5563' }}>(Seal)</div>
      </div>
    </div>
  );
}

function Box({ checked = false }: { checked?: boolean }) {
  return (
    <span style={{ flex: 'none', width: '1.35cqw', height: '1.35cqw', border: '.12cqw solid #111', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '700 1.2cqw/1 Arial, sans-serif' }}>
      {checked ? 'X' : ''}
    </span>
  );
}

function BoxRow({ checked = false, children }: { checked?: boolean; children: string }) {
  return (
    <div style={{ paddingLeft: '2cqw', display: 'flex', alignItems: 'center', gap: '.8cqw' }}>
      <Box checked={checked} />
      <span>{children}</span>
    </div>
  );
}

function Sign({ name }: { name: string }) {
  return (
    <div>
      <div style={{ borderBottom: '.1cqw solid #111', height: '1.6cqw' }} />
      <div style={{ fontSize: '1.42cqw' }}>{name}</div>
    </div>
  );
}
