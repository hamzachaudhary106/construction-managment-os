"""
Restrict Django admin to Merchants and Users only.
All other models are unregistered so platform admins only manage tenants (merchants) and their users.
"""
from django.contrib import admin
from django.contrib.admin.sites import NotRegistered
from django.contrib.auth.models import Group

# Construx360 admin branding
admin.site.site_header = 'Construx360 Admin'
admin.site.site_title = 'Construx360'
admin.site.index_title = 'Merchant & user management'

# Hide Django's Groups (we use company-based access, not auth groups)
try:
    admin.site.unregister(Group)
except NotRegistered:
    pass

# Unregister all app models except core.Company and core.User (handled in core/admin.py)
def unregister(model):
    try:
        admin.site.unregister(model)
    except NotRegistered:
        pass

# Audit
from audit.models import AuditLog
unregister(AuditLog)

# Bills
from bills.models import Bill
unregister(Bill)

# Contracts
from contracts.models import Contract, ContractPaymentSchedule
unregister(Contract)
unregister(ContractPaymentSchedule)

# Documents
from documents.models import ProjectDocument
unregister(ProjectDocument)

# Equipment
from equipment.models import Equipment, EquipmentAllocation, EquipmentMaintenance
unregister(Equipment)
unregister(EquipmentAllocation)
unregister(EquipmentMaintenance)

# Finances
from finances.models import Budget, Expense, Income
unregister(Budget)
unregister(Expense)
unregister(Income)

# Guarantees
from guarantees.models import BankGuarantee
unregister(BankGuarantee)

# Notifications
from notifications.models import Notification
unregister(Notification)

# Parties
from parties.models import Party
unregister(Party)

# Partners
from partners.models import Partner, ProjectInvestment, PartnerWithdrawal
unregister(Partner)
unregister(ProjectInvestment)
unregister(PartnerWithdrawal)

# Core (keep Company and User only)
from core.models import Client
unregister(Client)

# Projects
from projects.models import Project, ProjectPhase, ProjectMilestone, ProjectPhoto
unregister(Project)
unregister(ProjectPhase)
unregister(ProjectMilestone)
unregister(ProjectPhoto)

# Purchase orders
from purchase_orders.models import PurchaseOrder
unregister(PurchaseOrder)

# Sitelog
from sitelog.models import DailyLog, Issue, PunchItem
unregister(DailyLog)
unregister(Issue)
unregister(PunchItem)

# Transfers
from transfers.models import FundTransfer
unregister(FundTransfer)

# Variations
from variations.models import Variation
unregister(Variation)

# RFI
from rfi.models import RFI
unregister(RFI)

# Materials
from materials.models import Material, ProjectMaterial
unregister(Material)
unregister(ProjectMaterial)

# Safety
from safety.models import SafetyIncident, ToolboxTalk
unregister(SafetyIncident)
unregister(ToolboxTalk)

# Submittals
from submittals.models import Submittal
unregister(Submittal)
