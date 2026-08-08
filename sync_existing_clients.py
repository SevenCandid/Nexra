import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.database import AsyncSessionLocal
from app.db.models import User, UserRole, Contact, ContactGroup

async def sync_existing_users():
    print("[*] Starting sync of existing users to admin contacts...")
    
    async with AsyncSessionLocal() as db:
        # 1. Find the SUPERADMIN
        stmt = select(User).where(User.role == UserRole.SUPERADMIN).limit(1)
        admin = (await db.execute(stmt)).scalar_one_or_none()
        
        if not admin or not admin.organization_id:
            print("[-] No SUPERADMIN found or SUPERADMIN has no organization. Aborting.")
            return
            
        admin_org_id = admin.organization_id
        print(f"[+] Found SUPERADMIN organization: {admin_org_id}")
        
        # 2. Ensure "Platform Clients" group exists
        group_name = "Platform Clients"
        stmt = select(ContactGroup).where(
            ContactGroup.organization_id == admin_org_id,
            ContactGroup.name == group_name
        )
        client_group = (await db.execute(stmt)).scalar_one_or_none()
        
        if not client_group:
            client_group = ContactGroup(
                name=group_name,
                organization_id=admin_org_id,
                description="Automatically managed list of all signed-up clients"
            )
            db.add(client_group)
            await db.flush()
            print(f"[+] Created '{group_name}' segment.")
        else:
            print(f"[+] '{group_name}' segment already exists.")
            
        # 3. Fetch all users with a phone number
        stmt = select(User).where(User.phone_number.is_not(None))
        users = (await db.execute(stmt)).scalars().all()
        print(f"[*] Found {len(users)} users with phone numbers.")
        
        added_count = 0
        updated_count = 0
        
        for user in users:
            # Check if contact exists
            stmt = select(Contact).options(selectinload(Contact.groups)).where(
                Contact.organization_id == admin_org_id,
                Contact.phone_number == user.phone_number
            )
            contact = (await db.execute(stmt)).scalar_one_or_none()
            
            if not contact:
                contact = Contact(
                    phone_number=user.phone_number,
                    first_name=user.full_name or user.email,
                    organization_id=admin_org_id,
                    tags={"source": "system_signup_sync"}
                )
                contact.groups.append(client_group)
                db.add(contact)
                added_count += 1
            else:
                # Ensure it's in the group
                if not any(g.id == client_group.id for g in contact.groups):
                    contact.groups.append(client_group)
                    updated_count += 1
                    
        await db.commit()
        print(f"[+] Sync complete! Added {added_count} new contacts, and updated {updated_count} existing contacts to be in the group.")

if __name__ == "__main__":
    asyncio.run(sync_existing_users())
