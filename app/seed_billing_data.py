"""
Seed data for billing system - Network Pricing and Subscription Plans
Run this script to populate initial pricing data.
"""
import asyncio
from decimal import Decimal
from datetime import datetime
from app.db.database import SessionLocal
from app.db.models import NetworkPricing, SubscriptionPlan
from sqlalchemy import select

async def seed_network_pricing():
    """Seed network pricing data."""
    async with SessionLocal() as db:
        # Check if data already exists
        result = await db.execute(select(NetworkPricing))
        if result.scalar_one_or_none():
            print("Network pricing data already exists, skipping...")
            return
        
        pricing_data = [
            {
                "network_name": "MTN Ghana",
                "cost_per_sms": Decimal("0.05"),
                "currency": "GHS",
                "is_active": True
            },
            {
                "network_name": "Vodafone Ghana",
                "cost_per_sms": Decimal("0.048"),
                "currency": "GHS",
                "is_active": True
            },
            {
                "network_name": "AirtelTigo Ghana",
                "cost_per_sms": Decimal("0.052"),
                "currency": "GHS",
                "is_active": True
            },
        ]
        
        for data in pricing_data:
            pricing = NetworkPricing(**data)
            db.add(pricing)
        
        await db.commit()
        print(f"[+] Seeded {len(pricing_data)} network pricing entries")

async def seed_subscription_plans():
    """Seed subscription plan data with billing features."""
    async with SessionLocal() as db:
        # Check if data already exists
        result = await db.execute(select(SubscriptionPlan))
        if result.scalar_one_or_none():
            print("Subscription plans already exist, skipping...")
            return
        
        plans_data = [
            {
                "name": "Starter",
                "slug": "starter",
                "monthly_price": Decimal("50.00"),
                "sms_rate": Decimal("0.05"),  # Deprecated
                "max_users": 5,
                "monthly_credits": Decimal("1000.00"),
                "bonus_credits_on_signup": Decimal("100.00"),
                "pricing_model": "hybrid",
                "payg_rate_multiplier": Decimal("1.2"),  # 20% markup
                "features": {
                    "tps_limit": 5,
                    "api_access": True,
                    "webhook_support": False
                }
            },
            {
                "name": "Business",
                "slug": "business",
                "monthly_price": Decimal("200.00"),
                "sms_rate": Decimal("0.05"),
                "max_users": 20,
                "monthly_credits": Decimal("5000.00"),
                "bonus_credits_on_signup": Decimal("500.00"),
                "pricing_model": "hybrid",
                "payg_rate_multiplier": Decimal("1.1"),  # 10% markup
                "features": {
                    "tps_limit": 20,
                    "api_access": True,
                    "webhook_support": True,
                    "priority_support": True
                }
            },
            {
                "name": "Enterprise",
                "slug": "enterprise",
                "monthly_price": Decimal("1000.00"),
                "sms_rate": Decimal("0.05"),
                "max_users": 100,
                "monthly_credits": Decimal("30000.00"),
                "bonus_credits_on_signup": Decimal("3000.00"),
                "pricing_model": "hybrid",
                "payg_rate_multiplier": Decimal("1.0"),  # No markup
                "features": {
                    "tps_limit": 100,
                    "api_access": True,
                    "webhook_support": True,
                    "priority_support": True,
                    "dedicated_account_manager": True,
                    "custom_integrations": True
                }
            },
            {
                "name": "Pay As You Go",
                "slug": "payg",
                "monthly_price": Decimal("0.00"),
                "sms_rate": Decimal("0.05"),
                "max_users": 3,
                "monthly_credits": Decimal("0.00"),
                "bonus_credits_on_signup": Decimal("50.00"),  # Welcome bonus
                "pricing_model": "payg",
                "payg_rate_multiplier": Decimal("1.5"),  # 50% markup
                "features": {
                    "tps_limit": 3,
                    "api_access": True,
                    "webhook_support": False
                }
            }
        ]
        
        for data in plans_data:
            plan = SubscriptionPlan(**data)
            db.add(plan)
        
        await db.commit()
        print(f"[+] Seeded {len(plans_data)} subscription plans")

async def main():
    """Run all seed functions."""
    print("[*] Seeding billing system data...")
    await seed_network_pricing()
    await seed_subscription_plans()
    print("[+] Billing system seed data complete!")

if __name__ == "__main__":
    asyncio.run(main())
