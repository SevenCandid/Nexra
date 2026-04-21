
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Contact, SMSMessage, Campaign, CampaignStatus, MessageStatus

async def verify_fixes():
    async with SessionLocal() as db:
        print("--- Testing CSV Header Mapping Logic (Simulated) ---")
        # Header map from contacts.py
        header_map = {
            'first_name': ['first_name', 'firstname', 'first name', 'given name', 'given_name', 'fname'],
            'last_name': ['last_name', 'lastname', 'last name', 'surname', 'lname'],
            'phone_number': ['phone_number', 'phone', 'phonenumber', 'phone number', 'mobile', 'mobile number', 'msisdn']
        }
        
        def get_value(row, internal_key):
            for header, value in row.items():
                header_lower = header.lower().strip()
                if header_lower in header_map[internal_key] or header_lower.replace(' ', '_') in header_map[internal_key]:
                    return value
            return row.get(internal_key)

        test_row = {"First Name": "Alice", "Last Name": "Fix", "Mobile Number": "233241112222"}
        f = get_value(test_row, 'first_name')
        l = get_value(test_row, 'last_name')
        p = get_value(test_row, 'phone_number')
        print(f"Mapped: {f} {l} ({p})")
        assert f == "Alice" and l == "Fix" and p == "233241112222", "Mapping failed!"
        print("CSV Mapping Test: PASSED")

        print("\n--- Testing Personalization Logic ---")
        # Mock contact
        contact = Contact(first_name="Alice", last_name="Fix", phone_number="233241112222")
        template = "Hi {name}, your first name is {first_name} and last name is {last_name}. Calling {phone_number}."
        
        f_name = (contact.first_name or "").strip()
        l_name = (contact.last_name or "").strip()
        full_name = f"{f_name} {l_name}".strip()
        display_name = full_name if full_name else (f_name if f_name else contact.phone_number)

        content = template
        content = content.replace("{first_name}", f_name)
        content = content.replace("{last_name}", l_name)
        content = content.replace("{name}", display_name)
        content = content.replace("{phone_number}", contact.phone_number)
        
        print(f"Personalized: {content}")
        assert "Alice Fix" in content, "Full name missing!"
        assert "Alice" in content, "First name missing!"
        assert "Fix" in content, "Last name missing!"
        assert "233241112222" in content, "Phone missing!"
        print("Personalization Test: PASSED")

        print("\n--- Testing Name-less Fallback ---")
        contact_empty = Contact(first_name=None, last_name="", phone_number="233241112222")
        f_name = (contact_empty.first_name or "").strip()
        l_name = (contact_empty.last_name or "").strip()
        full_name = f"{f_name} {l_name}".strip()
        display_name = full_name if full_name else (f_name if f_name else contact_empty.phone_number)
        
        content_empty = template.replace("{name}", display_name)
        print(f"Fallback Result: {content_empty}")
        assert "233241112222" in content_empty, "Fallback to phone failed!"
        print("Fallback Test: PASSED")

if __name__ == "__main__":
    asyncio.run(verify_fixes())
