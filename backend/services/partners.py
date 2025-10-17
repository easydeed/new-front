"""
Partners Service
CRUD operations for Industry Partners (org-scoped)
"""

from typing import List, Dict, Optional
from database import get_db_connection
from psycopg2.extras import RealDictCursor


def list_partners(organization_id: str, active_only: bool = True) -> List[Dict]:
    """List all partners for an organization"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                id, organization_id, created_by_user_id,
                category, role, company_name, contact_name,
                email, phone, address_line1, address_line2,
                city, state, postal_code, notes, is_active,
                created_at, updated_at
            FROM partners
            WHERE organization_id = %s
        """
        params = [organization_id]
        
        if active_only:
            query += " AND is_active = TRUE"
        
        query += " ORDER BY company_name ASC"
        
        cursor.execute(query, params)
        partners = cursor.fetchall()
        
        # Convert to list of dicts with string IDs
        return [
            {
                **dict(partner),
                'id': str(partner['id'])  # Convert UUID to string
            }
            for partner in partners
        ]
        
    except Exception as e:
        print(f"Error listing partners: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


def create_partner(organization_id: str, user_id: int, data: Dict) -> Optional[Dict]:
    """Create a new partner"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            INSERT INTO partners (
                organization_id, created_by_user_id,
                category, role, company_name, contact_name,
                email, phone, address_line1, address_line2,
                city, state, postal_code, notes, is_active
            ) VALUES (
                %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            RETURNING 
                id, organization_id, created_by_user_id,
                category, role, company_name, contact_name,
                email, phone, address_line1, address_line2,
                city, state, postal_code, notes, is_active,
                created_at, updated_at
        """, (
            organization_id,
            user_id,
            data.get('category', 'other'),
            data.get('role', 'other'),
            data['company_name'],
            data.get('contact_name'),
            data.get('email'),
            data.get('phone'),
            data.get('address_line1'),
            data.get('address_line2'),
            data.get('city'),
            data.get('state'),
            data.get('postal_code'),
            data.get('notes'),
            data.get('is_active', True)
        ))
        
        partner = cursor.fetchone()
        conn.commit()
        
        if partner:
            return {
                **dict(partner),
                'id': str(partner['id'])  # Convert UUID to string
            }
        return None
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating partner: {e}")
        return None
    finally:
        cursor.close()
        conn.close()


def get_partner(partner_id: str, organization_id: str = None) -> Optional[Dict]:
    """Get a single partner by ID (optionally scoped to org)"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                id, organization_id, created_by_user_id,
                category, role, company_name, contact_name,
                email, phone, address_line1, address_line2,
                city, state, postal_code, notes, is_active,
                created_at, updated_at
            FROM partners
            WHERE id = %s::uuid
        """
        params = [partner_id]
        
        if organization_id:
            query += " AND organization_id = %s"
            params.append(organization_id)
        
        cursor.execute(query, params)
        partner = cursor.fetchone()
        
        if partner:
            return {
                **dict(partner),
                'id': str(partner['id'])
            }
        return None
        
    except Exception as e:
        print(f"Error getting partner: {e}")
        return None
    finally:
        cursor.close()
        conn.close()


def update_partner(partner_id: str, organization_id: str, data: Dict) -> Optional[Dict]:
    """Update a partner (must belong to organization)"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build dynamic update query
        update_fields = []
        params = []
        
        if 'category' in data:
            update_fields.append("category = %s")
            params.append(data['category'])
        if 'role' in data:
            update_fields.append("role = %s")
            params.append(data['role'])
        if 'company_name' in data:
            update_fields.append("company_name = %s")
            params.append(data['company_name'])
        if 'contact_name' in data:
            update_fields.append("contact_name = %s")
            params.append(data['contact_name'])
        if 'email' in data:
            update_fields.append("email = %s")
            params.append(data['email'])
        if 'phone' in data:
            update_fields.append("phone = %s")
            params.append(data['phone'])
        if 'address_line1' in data:
            update_fields.append("address_line1 = %s")
            params.append(data['address_line1'])
        if 'address_line2' in data:
            update_fields.append("address_line2 = %s")
            params.append(data['address_line2'])
        if 'city' in data:
            update_fields.append("city = %s")
            params.append(data['city'])
        if 'state' in data:
            update_fields.append("state = %s")
            params.append(data['state'])
        if 'postal_code' in data:
            update_fields.append("postal_code = %s")
            params.append(data['postal_code'])
        if 'notes' in data:
            update_fields.append("notes = %s")
            params.append(data['notes'])
        if 'is_active' in data:
            update_fields.append("is_active = %s")
            params.append(data['is_active'])
        
        if not update_fields:
            return get_partner(partner_id, organization_id)
        
        # Add updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        # Add WHERE conditions
        params.extend([partner_id, organization_id])
        
        query = f"""
            UPDATE partners
            SET {', '.join(update_fields)}
            WHERE id = %s::uuid AND organization_id = %s
            RETURNING 
                id, organization_id, created_by_user_id,
                category, role, company_name, contact_name,
                email, phone, address_line1, address_line2,
                city, state, postal_code, notes, is_active,
                created_at, updated_at
        """
        
        cursor.execute(query, params)
        partner = cursor.fetchone()
        conn.commit()
        
        if partner:
            return {
                **dict(partner),
                'id': str(partner['id'])
            }
        return None
        
    except Exception as e:
        conn.rollback()
        print(f"Error updating partner: {e}")
        return None
    finally:
        cursor.close()
        conn.close()


def delete_partner(partner_id: str, organization_id: str) -> bool:
    """Delete a partner (must belong to organization)"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM partners
            WHERE id = %s::uuid AND organization_id = %s
        """, (partner_id, organization_id))
        
        conn.commit()
        return cursor.rowcount > 0
        
    except Exception as e:
        conn.rollback()
        print(f"Error deleting partner: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


def list_all_partners(active_only: bool = False) -> List[Dict]:
    """List ALL partners across all organizations (admin only)"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT 
                id, organization_id, created_by_user_id,
                category, role, company_name, contact_name,
                email, phone, address_line1, address_line2,
                city, state, postal_code, notes, is_active,
                created_at, updated_at
            FROM partners
        """
        
        if active_only:
            query += " WHERE is_active = TRUE"
        
        query += " ORDER BY organization_id, company_name ASC"
        
        cursor.execute(query)
        partners = cursor.fetchall()
        
        return [
            {
                **dict(partner),
                'id': str(partner['id'])
            }
            for partner in partners
        ]
        
    except Exception as e:
        print(f"Error listing all partners: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

