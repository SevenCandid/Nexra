import re
with open('app/api/v1/endpoints/sms.py', 'r') as f:
    content = f.read()

# Fix 1: line 54
content = content.replace('cost = await billing_service.calculate_sms_cost(db, normalized_recipient, organization)', 'cost = await billing_service.calculate_sms_cost(db, normalized_recipient, sms_in.message, organization)', 1)

# Fix 2: move cost calculation in /send-bulk
match_cost_check = '''    cost = await billing_service.calculate_sms_cost(db, normalized_recipient, organization)

    if wallet.balance < cost:
        raise HTTPException(status_code=402, detail="Insufficient credits.")'''

content = content.replace(match_cost_check, '')

match_content_replace = '''    content = content.replace("{phone_number}", normalized_recipient)'''

replacement = '''    content = content.replace("{phone_number}", normalized_recipient)

    cost = await billing_service.calculate_sms_cost(db, normalized_recipient, content, organization)

    if wallet.balance < cost:
        raise HTTPException(status_code=402, detail="Insufficient credits.")'''

content = content.replace(match_content_replace, replacement)

with open('app/api/v1/endpoints/sms.py', 'w') as f:
    f.write(content)
