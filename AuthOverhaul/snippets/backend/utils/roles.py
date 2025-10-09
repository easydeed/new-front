def is_admin(role: str) -> bool:
    if not role:
        return False
    r = role.strip().lower()
    return r == 'admin' or r == 'administrator'
