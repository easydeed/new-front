# DeedPro Sharing & Approval Workflow Enhancement

## Overview

The sharing system exists but needs enhancement to provide a professional approval workflow. This document outlines the specific improvements needed.

**Current State:** Basic sharing with approve/reject works
**Target State:** Professional review workflow with PDF preview, structured feedback, and activity tracking

---

## Part 1: Quick Wins (Implement First)

### 1.1 Fix Resend Reminder

**File:** `backend/main.py` (around line 1850, the `/shared-deeds/{id}/resend` endpoint)

**Current:** Stub that does nothing

**Fix:**

```python
@app.post("/shared-deeds/{share_id}/resend")
def resend_share_reminder(
    share_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """Resend the approval reminder email"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get the share details
        cur.execute("""
            SELECT ds.*, d.deed_type, d.property_address, d.apn,
                   u.email as owner_email, u.full_name as owner_name
            FROM deed_shares ds
            JOIN deeds d ON ds.deed_id = d.id
            JOIN users u ON ds.owner_user_id = u.id
            WHERE ds.id = %s AND ds.owner_user_id = %s
        """, (share_id, user_id))
        
        share = cur.fetchone()
        if not share:
            raise HTTPException(status_code=404, detail="Share not found")
        
        if share['status'] in ('approved', 'rejected', 'revoked', 'expired'):
            raise HTTPException(status_code=400, detail=f"Cannot resend - share is {share['status']}")
        
        # Check if expired
        if share['expires_at'] < datetime.now(timezone.utc):
            # Extend expiration by 24 hours
            new_expiry = datetime.now(timezone.utc) + timedelta(hours=24)
            cur.execute("""
                UPDATE deed_shares 
                SET expires_at = %s, updated_at = NOW()
                WHERE id = %s
            """, (new_expiry, share_id))
        
        # Build approval URL
        approval_url = f"{FRONTEND_URL}/approve/{share['token']}"
        
        # Send reminder email
        send_share_reminder_email(
            recipient_email=share['recipient_email'],
            owner_name=share['owner_name'],
            deed_type=share['deed_type'],
            property_address=share['property_address'],
            approval_url=approval_url,
            expires_at=share['expires_at']
        )
        
        conn.commit()
        return {"success": True, "message": "Reminder sent"}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
```

**Add email function:**

```python
def send_share_reminder_email(
    recipient_email: str,
    owner_name: str,
    deed_type: str,
    property_address: str,
    approval_url: str,
    expires_at: datetime
):
    """Send a reminder email for pending approval"""
    
    hours_remaining = max(0, int((expires_at - datetime.now(timezone.utc)).total_seconds() / 3600))
    
    subject = f"Reminder: Deed Review Pending - {property_address}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Review Reminder</h2>
        <p>This is a reminder that <strong>{owner_name}</strong> is waiting for your review of a deed:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Deed Type:</strong> {deed_type}</p>
            <p style="margin: 5px 0;"><strong>Property:</strong> {property_address}</p>
            <p style="margin: 5px 0; color: #e53e3e;"><strong>Expires in:</strong> {hours_remaining} hours</p>
        </div>
        
        <a href="{approval_url}" 
           style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review Deed Now
        </a>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you did not expect this email, you can safely ignore it.
        </p>
    </div>
    """
    
    send_email(recipient_email, subject, html_content)
```

---

### 1.2 Add View Tracking

**File:** `backend/main.py` (the `GET /approve/{token}` endpoint)

**Add to the endpoint that fetches share details:**

```python
@app.get("/approve/{approval_token}")
def get_shared_deed_for_approval(approval_token: str):
    """Get deed details for approval - also tracks first view"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get share
        cur.execute("""
            SELECT ds.*, d.deed_type, d.property_address, d.apn, d.county,
                   d.grantors_text, d.grantees_text, d.pdf_url,
                   u.full_name as owner_name, u.email as owner_email
            FROM deed_shares ds
            JOIN deeds d ON ds.deed_id = d.id
            JOIN users u ON ds.owner_user_id = u.id
            WHERE ds.token = %s
        """, (approval_token,))
        
        share = cur.fetchone()
        if not share:
            raise HTTPException(status_code=404, detail="Share not found or expired")
        
        # Check expiration
        if share['expires_at'] < datetime.now(timezone.utc):
            cur.execute("UPDATE deed_shares SET status = 'expired' WHERE id = %s", (share['id'],))
            conn.commit()
            raise HTTPException(status_code=410, detail="This approval link has expired")
        
        # Track first view (only if status is still 'sent')
        if share['status'] == 'sent':
            cur.execute("""
                UPDATE deed_shares 
                SET status = 'viewed', viewed_at = NOW(), updated_at = NOW()
                WHERE id = %s AND status = 'sent'
            """, (share['id'],))
            conn.commit()
        
        # Return deed details (excluding sensitive data)
        return {
            "deed_type": share['deed_type'],
            "property_address": share['property_address'],
            "apn": share['apn'],
            "county": share['county'],
            "grantors": share['grantors_text'],
            "grantees": share['grantees_text'],
            "owner_name": share['owner_name'],
            "expires_at": share['expires_at'].isoformat(),
            "status": share['status'],
            "pdf_url": share['pdf_url'],  # Add PDF URL for preview
        }
        
    finally:
        cur.close()
        conn.close()
```

**Add migration for viewed_at column:**

```sql
-- migrations/add_viewed_at_to_deed_shares.sql
ALTER TABLE deed_shares ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
```

---

### 1.3 Configurable Expiration

**File:** `backend/main.py` (share creation endpoint)

**Update ShareDeedCreate model:**

```python
class ShareDeedCreate(BaseModel):
    deed_id: int
    recipient_name: str
    recipient_email: str
    recipient_role: Optional[str] = None
    message: Optional[str] = None
    expires_in_hours: Optional[int] = 168  # Default 7 days (was 24 hours)
    
    @validator('expires_in_hours')
    def validate_expiry(cls, v):
        if v is not None and (v < 1 or v > 720):  # 1 hour to 30 days
            raise ValueError('Expiration must be between 1 and 720 hours')
        return v
```

**Update share creation:**

```python
# In share_deed_for_approval()
expires_in = share_data.expires_in_hours or 168  # Default 7 days
expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in)
```

**Update frontend share modal:**

```tsx
// In past-deeds/page.tsx share form
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">Link Expires In</label>
  <select 
    name="expires_in_hours" 
    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
    defaultValue="168"
  >
    <option value="24">24 hours</option>
    <option value="72">3 days</option>
    <option value="168">7 days (recommended)</option>
    <option value="336">14 days</option>
    <option value="720">30 days</option>
  </select>
</div>
```

---

## Part 2: PDF Preview for Recipients

### 2.1 Backend: Secure PDF Access

**File:** `backend/main.py`

**Add endpoint for authenticated PDF access:**

```python
@app.get("/approve/{approval_token}/pdf")
def get_shared_deed_pdf(approval_token: str):
    """
    Get the PDF for a shared deed.
    Requires valid, non-expired token.
    """
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT ds.*, d.pdf_data, d.deed_type, d.property_address
            FROM deed_shares ds
            JOIN deeds d ON ds.deed_id = d.id
            WHERE ds.token = %s
        """, (approval_token,))
        
        share = cur.fetchone()
        if not share:
            raise HTTPException(status_code=404, detail="Share not found")
        
        # Check expiration
        if share['expires_at'] < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="This link has expired")
        
        # Check status (allow viewing even if rejected, but not if revoked)
        if share['status'] == 'revoked':
            raise HTTPException(status_code=403, detail="Access has been revoked")
        
        # Return PDF
        if share['pdf_data']:
            return Response(
                content=share['pdf_data'],
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"inline; filename=\"{share['deed_type']}_{share['property_address']}.pdf\""
                }
            )
        else:
            raise HTTPException(status_code=404, detail="PDF not found")
            
    finally:
        cur.close()
        conn.close()
```

### 2.2 Frontend: PDF Preview Component

**File:** `frontend/src/app/approve/[token]/page.tsx`

**Enhanced approval page with PDF preview:**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Eye,
  MessageSquare,
  User,
  MapPin,
  Building
} from 'lucide-react';

interface DeedDetails {
  deed_type: string;
  property_address: string;
  apn: string;
  county: string;
  grantors: string;
  grantees: string;
  owner_name: string;
  expires_at: string;
  status: string;
  pdf_url?: string;
}

export default function ApproveDeedPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [deed, setDeed] = useState<DeedDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

  // Common issues for structured feedback
  const COMMON_ISSUES = [
    { id: 'grantor_name', label: 'Grantor name incorrect' },
    { id: 'grantee_name', label: 'Grantee name incorrect' },
    { id: 'legal_description', label: 'Legal description issue' },
    { id: 'vesting', label: 'Vesting incorrect' },
    { id: 'property_address', label: 'Property address incorrect' },
    { id: 'apn', label: 'APN incorrect' },
    { id: 'dtt', label: 'Transfer tax issue' },
    { id: 'other', label: 'Other issue' },
  ];

  useEffect(() => {
    fetchDeedDetails();
  }, [token]);

  const fetchDeedDetails = async () => {
    try {
      const response = await fetch(`/api/approve/${token}`);
      if (!response.ok) {
        if (response.status === 410) {
          setError('This approval link has expired. Please request a new link from the sender.');
        } else if (response.status === 404) {
          setError('This approval link is invalid or has been revoked.');
        } else {
          setError('Unable to load deed details.');
        }
        return;
      }
      const data = await response.json();
      setDeed(data);
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });
      
      if (response.ok) {
        setSubmitted(true);
      } else {
        setError('Failed to submit approval.');
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectComments.trim() && selectedIssues.length === 0) {
      return;
    }
    
    setSubmitting(true);
    try {
      // Build structured feedback
      const feedback = {
        issues: selectedIssues,
        comments: rejectComments,
        timestamp: new Date().toISOString(),
      };
      
      const response = await fetch(`/api/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approved: false, 
          comments: JSON.stringify(feedback),
        }),
      });
      
      if (response.ok) {
        setSubmitted(true);
      } else {
        setError('Failed to submit feedback.');
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeRemaining = () => {
    if (!deed?.expires_at) return '';
    const expires = new Date(deed.expires_at);
    const now = new Date();
    const hours = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    return 'Expiring soon';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {showRejectForm ? 'Feedback Submitted' : 'Deed Approved'}
          </h1>
          <p className="text-gray-600">
            {showRejectForm 
              ? 'Your feedback has been sent to the sender. They will revise and re-share the deed.'
              : 'Thank you for your approval. The sender has been notified.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="font-semibold text-gray-900">Deed Review</h1>
              <p className="text-sm text-gray-500">From {deed?.owner_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4" />
            <span>{getTimeRemaining()}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Deed Details */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Deed Details</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Deed Type</div>
                  <div className="font-medium text-gray-900">{deed?.deed_type}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Property
                  </div>
                  <div className="font-medium text-gray-900">{deed?.property_address}</div>
                  <div className="text-sm text-gray-500">APN: {deed?.apn}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Building className="w-3 h-3" /> County
                  </div>
                  <div className="font-medium text-gray-900">{deed?.county}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Grantor
                  </div>
                  <div className="font-medium text-gray-900">{deed?.grantors}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Grantee
                  </div>
                  <div className="font-medium text-gray-900">{deed?.grantees}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!showRejectForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Your Decision</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve Deed
                  </button>
                  
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Request Changes
                  </button>
                </div>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Request Changes</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      What needs to be corrected?
                    </label>
                    <div className="space-y-2">
                      {COMMON_ISSUES.map((issue) => (
                        <label key={issue.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIssues.includes(issue.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIssues([...selectedIssues, issue.id]);
                              } else {
                                setSelectedIssues(selectedIssues.filter(i => i !== issue.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{issue.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Additional comments
                    </label>
                    <textarea
                      value={rejectComments}
                      onChange={(e) => setRejectComments(e.target.value)}
                      placeholder="Please describe what needs to be changed..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting || (selectedIssues.length === 0 && !rejectComments.trim())}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PDF Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Document Preview</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPdfPreview(!showPdfPreview)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    {showPdfPreview ? 'Hide' : 'Show'} Preview
                  </button>
                  <a
                    href={`/api/approve/${token}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-50"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                </div>
              </div>
              
              <div className="h-[700px] bg-gray-100">
                {showPdfPreview ? (
                  <iframe
                    src={`/api/approve/${token}/pdf`}
                    className="w-full h-full"
                    title="Deed PDF Preview"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>Click "Show Preview" to view the deed</p>
                      <p className="text-sm mt-1">or download the PDF to review</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## Part 3: Enhanced Feedback Display for EO

### 3.1 Parse Structured Feedback

**File:** `frontend/src/app/shared-deeds/page.tsx`

**Update the feedback modal to display structured feedback:**

```tsx
// Add this component
function FeedbackDisplay({ feedback }: { feedback: string }) {
  // Try to parse as structured feedback
  let parsed: { issues?: string[]; comments?: string } | null = null;
  try {
    parsed = JSON.parse(feedback);
  } catch {
    // Legacy plain text feedback
    return <p className="text-gray-700">{feedback}</p>;
  }

  const ISSUE_LABELS: Record<string, string> = {
    grantor_name: 'Grantor name incorrect',
    grantee_name: 'Grantee name incorrect',
    legal_description: 'Legal description issue',
    vesting: 'Vesting incorrect',
    property_address: 'Property address incorrect',
    apn: 'APN incorrect',
    dtt: 'Transfer tax issue',
    other: 'Other issue',
  };

  return (
    <div className="space-y-4">
      {parsed?.issues && parsed.issues.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Issues Identified:</h4>
          <ul className="space-y-1">
            {parsed.issues.map((issue) => (
              <li key={issue} className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="w-4 h-4" />
                {ISSUE_LABELS[issue] || issue}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {parsed?.comments && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Comments:</h4>
          <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{parsed.comments}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Part 4: Activity Tracking

### 4.1 Update Database

**File:** `backend/migrations/add_sharing_activity.sql`

```sql
-- Add activity tracking to deed_shares
ALTER TABLE deed_shares 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Create activity log table
CREATE TABLE IF NOT EXISTS deed_share_activity (
    id SERIAL PRIMARY KEY,
    share_id INTEGER NOT NULL REFERENCES deed_shares(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'created', 'viewed', 'reminded', 'approved', 'rejected', 'revoked'
    actor_email VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_activity_share_id ON deed_share_activity(share_id);
```

### 4.2 Log Activities

**File:** `backend/main.py`

**Add helper function:**

```python
def log_share_activity(
    cur,
    share_id: int,
    activity_type: str,
    actor_email: str = None,
    metadata: dict = None
):
    """Log sharing activity for audit trail"""
    cur.execute("""
        INSERT INTO deed_share_activity (share_id, activity_type, actor_email, metadata)
        VALUES (%s, %s, %s, %s)
    """, (share_id, activity_type, actor_email, json.dumps(metadata) if metadata else None))
```

**Use in endpoints:**

```python
# In share creation
log_share_activity(cur, share_id, 'created', user_email, {'recipient': recipient_email})

# In view tracking
log_share_activity(cur, share_id, 'viewed', recipient_email)

# In approval
log_share_activity(cur, share_id, 'approved', recipient_email)

# In rejection
log_share_activity(cur, share_id, 'rejected', recipient_email, {'issues': selected_issues})

# In resend
log_share_activity(cur, share_id, 'reminded', user_email)

# In revoke
log_share_activity(cur, share_id, 'revoked', user_email)
```

---

## Part 5: Email Notification for Approval

### 5.1 Send Email When Approved

**File:** `backend/main.py` (in approval submission endpoint)

**Add approval notification:**

```python
# In submit_approval_response(), after updating status to approved:
if response.approved:
    cur.execute("UPDATE deed_shares SET status = 'approved', updated_at = NOW() WHERE id = %s", (share_id,))
    
    # Send approval notification to owner
    send_approval_notification_email(
        owner_email=share['owner_email'],
        owner_name=share['owner_name'],
        deed_type=share['deed_type'],
        property_address=share['property_address'],
        reviewer_email=share['recipient_email'],
        reviewer_name=response.reviewer_name or share['recipient_email'],
    )
    
    # Create in-app notification
    cur.execute("""
        INSERT INTO notifications (user_id, type, title, message, data, created_at)
        VALUES (%s, 'share_approved', 'Deed Approved', %s, %s, NOW())
    """, (
        share['owner_user_id'],
        f"Your {share['deed_type']} for {share['property_address']} has been approved",
        json.dumps({'share_id': share_id, 'deed_id': share['deed_id']})
    ))
```

**Email function:**

```python
def send_approval_notification_email(
    owner_email: str,
    owner_name: str,
    deed_type: str,
    property_address: str,
    reviewer_email: str,
    reviewer_name: str
):
    subject = f"✓ Deed Approved - {property_address}"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">✓ Deed Approved</h2>
        </div>
        
        <div style="padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <p>Hi {owner_name},</p>
            
            <p>Great news! Your deed has been approved:</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Deed Type:</strong> {deed_type}</p>
                <p style="margin: 5px 0;"><strong>Property:</strong> {property_address}</p>
                <p style="margin: 5px 0;"><strong>Approved by:</strong> {reviewer_name}</p>
            </div>
            
            <p>The deed is ready for recording.</p>
            
            <a href="{FRONTEND_URL}/past-deeds" 
               style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Deed
            </a>
        </div>
    </div>
    """
    
    send_email(owner_email, subject, html_content)
```

---

## Summary of Changes

### Backend Files to Modify/Create

| File | Changes |
|------|---------|
| `backend/main.py` | Fix resend, add view tracking, add PDF endpoint, add activity logging, add approval email |
| `backend/migrations/add_sharing_enhancements.sql` | Add viewed_at, activity table |

### Frontend Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/app/approve/[token]/page.tsx` | Complete rewrite with PDF preview, structured feedback |
| `frontend/src/app/shared-deeds/page.tsx` | Add FeedbackDisplay component, parse structured feedback |
| `frontend/src/app/past-deeds/page.tsx` | Add expiration selector to share modal |

### Testing Checklist

- [ ] Share modal shows expiration options
- [ ] Resend reminder sends email and extends expiration
- [ ] Recipient sees "viewed" status after opening link
- [ ] Recipient can preview PDF inline
- [ ] Recipient can download PDF
- [ ] Approval sends email to EO
- [ ] Rejection shows structured issue checkboxes
- [ ] EO sees structured feedback in shared-deeds page
- [ ] Activity log captures all events
