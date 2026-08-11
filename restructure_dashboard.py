import re

with open('nexra-dashboard/src/pages/DashboardPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change grid container
content = content.replace(
    '<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">',
    '<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">'
)

# 2. Extract Activity Card
activity_start = content.find('<${Card} className="lg:col-span-2 p-4">')
activity_end = content.find('</${Card}>', activity_start) + len('</${Card}>')
activity_card = content[activity_start:activity_end].replace('lg:col-span-2 p-4', 'p-4')

# 3. Extract Delivery Performance Card
dp_start = content.find('<${Card} className="p-4">', activity_end)
dp_end = content.find('</${Card}>', dp_start) + len('</${Card}>')
dp_card = content[dp_start:dp_end]

# 4. Extract Recent Campaigns Card
rc_start = content.find('<${Card} className="p-4 lg:p-6 overflow-hidden">', dp_end)
rc_end = content.find('</${Card}>', rc_start) + len('</${Card}>')
rc_card = content[rc_start:rc_end]

# Replace the whole block from activity_start to rc_end
original_block = content[activity_start:rc_end]

new_block = f"""<div className="lg:col-span-2 flex flex-col gap-4">
    {activity_card}
    {rc_card}
</div>
<div className="lg:col-span-1 flex flex-col gap-4">
    {dp_card}
</div>"""

content = content.replace(original_block, new_block)

with open('nexra-dashboard/src/pages/DashboardPage.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done!")
