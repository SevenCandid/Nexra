import re

with open('nexra-dashboard/src/pages/DashboardPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Define recentCampaignsBlock
recent_campaigns_block = """
    const recentCampaignsBlock = html`
        <${Card} className="p-4 lg:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Campaigns</h2>
                <a href="#/campaigns" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View all
                </a>
            </div>

            ${campaigns.length === 0 ? html`
                <div className="text-center py-8 text-gray-500">
                    <${Icon} name="inbox" size=${48} className="mx-auto mb-2 text-gray-400" />
                    <p>No campaigns yet</p>
                </div>
            ` : html`
                <div className="space-y-3">
                    ${campaigns.map((campaign) => html`
                        <div key=${campaign.id} className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-midnight-900/50 rounded-xl border border-gray-100/50 dark:border-midnight-800 shadow-sm transition-all hover:border-primary-100 dark:hover:border-primary-900/50 group">
                            <div className="flex-1">
                                <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">${campaign.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-midnight-500 uppercase tracking-widest mt-0.5">
                                    ${new Date(campaign.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <${Badge} variant=${
                                campaign.status === 'completed' ? 'success' :
                                campaign.status === 'failed' ? 'danger' :
                                campaign.status === 'delivering' || campaign.status === 'sending' ? 'info' :
                                campaign.status === 'scheduled' ? 'warning' : 'default'
                            }>
                                ${{ completed: 'Completed', delivering: 'Delivering', sending: 'Sending', failed: 'Failed', draft: 'Draft', scheduled: 'Scheduled' }[campaign.status] || campaign.status}
                            </${Badge}>
                        </div>
                    `)}
                </div>
            `}
        </${Card}>
    `;
"""

# Find return html`
return_index = content.find('return html`')
content = content[:return_index] + recent_campaigns_block + "\n    " + content[return_index:]

# 2. Extract original Recent Campaigns Card from JSX and remove it
rc_start = content.find('<${Card} className="p-4 lg:p-6 overflow-hidden">')
rc_end = content.find('</${Card}>', rc_start) + len('</${Card}>')

content = content[:rc_start] + content[rc_end:]

# 3. Add ${recentCampaignsBlock} in desktop location (inside Activity column)
# Find the end of Activity Card
activity_end = content.find('</${Card}>', content.find('<${Card} className="p-4">')) + len('</${Card}>')

# Insert the hidden lg:block wrapper
desktop_rc = """
                    <div className="hidden lg:block">
                        ${recentCampaignsBlock}
                    </div>
"""
content = content[:activity_end] + desktop_rc + content[activity_end:]

# 4. Add ${recentCampaignsBlock} in mobile location (end of grid)
# Find the end of Delivery Performance Card wrapper
# In current file:
#             </div>
# </div>
#             <div className="grid grid-cols-2 gap-3 mb-4">
dp_wrapper_end = content.find('</div>\n            </div>\n\n            <${TourModal} />')
if dp_wrapper_end == -1:
    dp_wrapper_end = content.find('</div>\n            </div>\n\n')

mobile_rc = """
            <div className="block lg:hidden w-full mb-4">
                ${recentCampaignsBlock}
            </div>
"""

content = content[:dp_wrapper_end] + mobile_rc + content[dp_wrapper_end:]

with open('nexra-dashboard/src/pages/DashboardPage.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done!")
