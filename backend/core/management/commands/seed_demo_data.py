"""
Seed the database with realistic demo data for construction management.
Run: python manage.py seed_demo_data
Use --clear to remove existing demo data first (optional; see help).
"""
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import Company, User, Client
from projects.models import Project, ProjectPhase, ProjectMilestone, ProjectPhoto
from parties.models import Party
from contracts.models import Contract, ContractPaymentSchedule
from variations.models import Variation
from guarantees.models import BankGuarantee
from purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from bills.models import Bill
from equipment.models import Equipment, EquipmentAllocation, EquipmentMaintenance
from documents.models import ProjectDocument
from sitelog.models import DailyLog, Issue, PunchItem
from finances.models import Budget, Expense, Income, EXPENSE_CATEGORIES
from notifications.models import Notification
from transfers.models import FundTransfer
from partners.models import Partner, ProjectInvestment, PartnerWithdrawal
from rfi.models import RFI
from materials.models import Material, ProjectMaterial
from safety.models import SafetyIncident, ToolboxTalk
from submittals.models import Submittal


class Command(BaseCommand):
    help = 'Load demo data (projects, parties, contracts, bills, etc.) for testing and demos.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing demo data before seeding (keeps users and company).',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        clear = options.get('clear', False)
        today = timezone.now().date()

        # Resolve user for created_by and notifications (required for notifications)
        demo_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if not demo_user:
            self.stdout.write(self.style.ERROR('No user found. Create a superuser first: python manage.py createsuperuser'))
            return

        company, _ = Company.objects.get_or_create(
            code='DEMO',
            defaults={'name': 'Demo Construction Ltd'},
        )

        if clear:
            self._clear_demo_data(company)
            self.stdout.write(self.style.WARNING('Cleared demo data.'))

        # Avoid duplicating if we already have demo projects
        if Project.objects.filter(company=company).exists() and not clear:
            self.stdout.write(self.style.WARNING('Demo data already exists. Use --clear to replace.'))
            return

        # A demo client (owner) for some projects
        demo_client, _ = Client.objects.get_or_create(
            company=company,
            name='Sunrise Developers',
            defaults={
                'contact_person': 'Muhammad Ali',
                'email': 'projects@sunrisedev.pk',
                'phone': '+92 300 2223344',
                'address': 'Clifton, Karachi',
                'notes': 'Key client for residential tower and school.',
            },
        )

        # Projects
        p1 = Project.objects.create(
            name='Residential Tower - Phase A',
            description='12-storey residential building with basement parking.',
            start_date=today - timedelta(days=180),
            end_date=today + timedelta(days=365),
            status='active',
            company=company,
            client=demo_client,
            created_by=demo_user,
        )
        p2 = Project.objects.create(
            name='Commercial Plaza - Block B',
            description='Four-storey commercial and retail complex.',
            start_date=today - timedelta(days=90),
            end_date=today + timedelta(days=450),
            status='active',
            company=company,
            created_by=demo_user,
        )
        p3 = Project.objects.create(
            name='Highway Section 2B',
            description='Road widening and drainage works, 8 km stretch.',
            start_date=today - timedelta(days=365),
            end_date=today - timedelta(days=30),
            status='completed',
            company=company,
            created_by=demo_user,
        )
        p4 = Project.objects.create(
            name='Warehouse Complex - Plot 5',
            description='Single-storey warehouse and loading bays, 15,000 sq ft.',
            start_date=today - timedelta(days=60),
            end_date=today + timedelta(days=180),
            status='on_hold',
            company=company,
            created_by=demo_user,
        )
        p5 = Project.objects.create(
            name='School Building - Block A',
            description='Three-storey school with 24 classrooms and admin block.',
            start_date=today - timedelta(days=30),
            end_date=today + timedelta(days=540),
            status='active',
            company=company,
            client=demo_client,
            created_by=demo_user,
        )
        projects = [p1, p2, p3, p4, p5]

        # Phases & milestones
        for proj, phase_names in [(p1, ['Foundation', 'Structure', 'MEP', 'Finishing']), (p2, ['Site Prep', 'Structure', 'Façade', 'Handover']), (p3, ['Earthwork', 'Pavement', 'Drainage', 'Signage']), (p4, ['Site Clear', 'Slab', 'Shell', 'MEP']), (p5, ['Foundation', 'Structure', 'Finishes', 'MEP', 'Handover'])]:
            for i, name in enumerate(phase_names):
                ProjectPhase.objects.create(project=proj, name=name, order=i + 1)
        ProjectMilestone.objects.create(project=p1, title='Foundation complete', due_date=today - timedelta(days=120), completed=True, completed_date=today - timedelta(days=125))
        ProjectMilestone.objects.create(project=p1, title='Structure complete', due_date=today + timedelta(days=90), completed=False)
        ProjectMilestone.objects.create(project=p2, title='Handover Block B', due_date=today + timedelta(days=200), completed=False)
        ProjectMilestone.objects.create(project=p3, title='Pavement complete', due_date=today - timedelta(days=60), completed=True, completed_date=today - timedelta(days=55))
        ProjectMilestone.objects.create(project=p5, title='Foundation complete', due_date=today + timedelta(days=120), completed=False)

        # Parties (subcontractors and suppliers)
        subs = [
            Party.objects.create(company=company, party_type='subcontractor', name='Al-Rahim Steel Works', contact_person='Tariq Khan', phone='+92 300 1234567', email='tariq@alrahimsteel.com', tax_id='NTN-123', address='SITE, Karachi', notes='Reinforcement and structural steel'),
            Party.objects.create(company=company, party_type='subcontractor', name='City MEP Contractors', contact_person='Ahmed Hassan', phone='+92 321 9876543', email='ahmed@citymep.pk', address='Korangi, Karachi'),
            Party.objects.create(company=company, party_type='subcontractor', name='Premier Tiling & Finishing', contact_person='Rashid Mahmood', phone='+92 333 5551234', notes='Marble and tile work'),
            Party.objects.create(company=company, party_type='subcontractor', name='National Earthworks Ltd', contact_person='Khalid Mehmood', phone='+92 302 7778899', email='khalid@nationalearthworks.pk', address='Faisalabad', notes='Excavation and grading'),
            Party.objects.create(company=company, party_type='subcontractor', name='Safe Electrics', contact_person='Farhan Ahmed', phone='+92 333 1112233', email='farhan@safeelectrics.com', address='Karachi'),
        ]
        supps = [
            Party.objects.create(company=company, party_type='supplier', name='Fauji Cement Co.', contact_person='Sales Dept', phone='+92 42 111 234567', email='sales@faujicement.com', tax_id='NTN-456', address='Lahore'),
            Party.objects.create(company=company, party_type='supplier', name='DG Khan Cement', contact_person='Regional Manager', phone='+92 51 111 567890', address='Islamabad'),
            Party.objects.create(company=company, party_type='supplier', name='Steel & Pipes Traders', contact_person='Imran Ali', phone='+92 21 34567890', email='orders@steelpipes.pk', address='SITE, Karachi'),
            Party.objects.create(company=company, party_type='supplier', name='BuildMart Hardware', contact_person='Sana Khan', phone='+92 42 333 445566', email='orders@buildmart.pk', address='Lahore', notes='Hardware and fittings'),
        ]
        all_parties = subs + supps

        # Contracts (with payment schedules)
        c1 = Contract.objects.create(
            project=p1,
            title='Structural steel and reinforcement',
            contractor_name='Al-Rahim Steel Works',
            total_value=Decimal('185000.00'),
            currency='PKR',
            status='active',
            party=subs[0],
            start_date=today - timedelta(days=170),
            end_date=today + timedelta(days=200),
            notes='Lump sum for B1–B4',
        )
        for i, (desc, amt, due) in enumerate([
            ('Mobilization', '25000', 30),
            ('Stage 1 – Foundation steel', '45000', 90),
            ('Stage 2 – Columns & beams', '55000', 150),
            ('Stage 3 – Slabs', '40000', 220),
            ('Final & retention release', '20000', 280),
        ]):
            ContractPaymentSchedule.objects.create(contract=c1, description=desc, amount=Decimal(amt), due_date=today + timedelta(days=due), status='paid' if i < 2 else 'pending')

        c2 = Contract.objects.create(
            project=p1,
            title='MEP installation',
            contractor_name='City MEP Contractors',
            total_value=Decimal('92000.00'),
            currency='PKR',
            status='active',
            party=subs[1],
            start_date=today - timedelta(days=60),
            end_date=today + timedelta(days=180),
        )
        ContractPaymentSchedule.objects.create(
            contract=c2,
            description='Advance',
            amount=Decimal('27600'),
            due_date=today - timedelta(days=55),
            status='paid',
        )
        ContractPaymentSchedule.objects.create(
            contract=c2,
            description='Balance on completion',
            amount=Decimal('64400'),
            due_date=today + timedelta(days=175),
            status='pending',
        )

        c3 = Contract.objects.create(
            project=p2,
            title='Civil and structure',
            contractor_name='In-house / TBC',
            total_value=Decimal('450000.00'),
            currency='PKR',
            status='draft',
            party=None,
        )
        c4 = Contract.objects.create(
            project=p2,
            title='Façade and cladding',
            contractor_name='Premier Tiling & Finishing',
            total_value=Decimal('85000.00'),
            currency='PKR',
            status='active',
            party=subs[2],
            start_date=today - timedelta(days=30),
            end_date=today + timedelta(days=150),
        )
        ContractPaymentSchedule.objects.create(
            contract=c4,
            description='Mobilization',
            amount=Decimal('17000'),
            due_date=today + timedelta(days=30),
            status='pending',
        )
        ContractPaymentSchedule.objects.create(
            contract=c4,
            description='Progress payment 1',
            amount=Decimal('34000'),
            due_date=today + timedelta(days=90),
            status='pending',
        )
        ContractPaymentSchedule.objects.create(
            contract=c4,
            description='Final',
            amount=Decimal('34000'),
            due_date=today + timedelta(days=145),
            status='pending',
        )
        c5 = Contract.objects.create(
            project=p3,
            title='Earthworks and grading',
            contractor_name='National Earthworks Ltd',
            total_value=Decimal('120000.00'),
            currency='PKR',
            status='completed',
            party=subs[3],
            start_date=today - timedelta(days=350),
            end_date=today - timedelta(days=100),
        )
        ContractPaymentSchedule.objects.create(
            contract=c5,
            description='Stage 1',
            amount=Decimal('60000'),
            due_date=today - timedelta(days=200),
            status='paid',
        )
        ContractPaymentSchedule.objects.create(
            contract=c5,
            description='Stage 2',
            amount=Decimal('60000'),
            due_date=today - timedelta(days=110),
            status='paid',
        )
        c6 = Contract.objects.create(
            project=p5,
            title='Electrical works',
            contractor_name='Safe Electrics',
            total_value=Decimal('42000.00'),
            currency='PKR',
            status='active',
            party=subs[4],
            start_date=today - timedelta(days=20),
            end_date=today + timedelta(days=200),
        )
        ContractPaymentSchedule.objects.create(
            contract=c6,
            description='Advance',
            amount=Decimal('12600'),
            due_date=today + timedelta(days=10),
            status='pending',
        )
        ContractPaymentSchedule.objects.create(
            contract=c6,
            description='On completion',
            amount=Decimal('29400'),
            due_date=today + timedelta(days=195),
            status='pending',
        )
        contracts = [c1, c2, c3, c4, c5, c6]

        # Variations
        Variation.objects.create(
            project=p1,
            contract=c1,
            title='Additional basement reinforcement',
            amount=Decimal('85000.00'),
            status='approved',
            variation_date=today - timedelta(days=100),
        )
        Variation.objects.create(
            project=p1,
            contract=c2,
            title='Extra lighting points – common areas',
            amount=Decimal('32000.00'),
            status='pending',
            variation_date=today - timedelta(days=20),
        )
        Variation.objects.create(
            project=p2,
            contract=None,
            title='Soil improvement – Block B',
            amount=Decimal('21000.00'),
            status='approved',
            variation_date=today - timedelta(days=70),
        )
        Variation.objects.create(
            project=p2,
            contract=c4,
            title='Premium cladding – main entrance',
            amount=Decimal('45000.00'),
            status='pending',
            variation_date=today - timedelta(days=10),
        )
        Variation.objects.create(
            project=p5,
            contract=c6,
            title='Extra power points – labs',
            amount=Decimal('18000.00'),
            status='approved',
            variation_date=today - timedelta(days=5),
        )

        # Bank guarantees
        BankGuarantee.objects.create(
            project=p1,
            guarantee_type='performance',
            bank_name='HBL',
            amount=Decimal('185000'),
            validity_from=today - timedelta(days=175),
            validity_to=today + timedelta(days=190),
            reference_number='BG-P-2024-001',
            notes='Against structural contract',
        )
        BankGuarantee.objects.create(
            project=p1,
            guarantee_type='advance',
            bank_name='UBL',
            amount=Decimal('92500'),
            validity_from=today - timedelta(days=60),
            validity_to=today + timedelta(days=305),
            reference_number='BG-A-2024-002',
        )
        BankGuarantee.objects.create(
            project=p2,
            guarantee_type='retention',
            bank_name='MCB',
            amount=Decimal('225000'),
            validity_from=today - timedelta(days=80),
            validity_to=today + timedelta(days=455),
            reference_number='BG-R-2024-003',
        )
        BankGuarantee.objects.create(
            project=p5,
            guarantee_type='performance',
            bank_name='HBL',
            amount=Decimal('42000'),
            validity_from=today - timedelta(days=25),
            validity_to=today + timedelta(days=220),
            reference_number='BG-P-2024-004',
            notes='Against electrical contract',
        )

        # Purchase orders (suppliers)
        po1 = PurchaseOrder.objects.create(
            project=p1,
            supplier=supps[0],
            po_number='PO-2024-101',
            status='received',
            order_date=today - timedelta(days=150),
            expected_date=today - timedelta(days=140),
            notes='Cement for foundation',
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po1,
            description='Portland cement 50kg bags',
            quantity=Decimal('1200'),
            unit='Nos',
            rate=Decimal('325'),
            amount=Decimal('390000'),
        )
        po2 = PurchaseOrder.objects.create(
            project=p1,
            supplier=supps[2],
            po_number='PO-2024-102',
            status='ordered',
            order_date=today - timedelta(days=30),
            expected_date=today + timedelta(days=15),
            notes='Steel bars for slab',
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po2,
            description='Steel bars 12mm',
            quantity=Decimal('5000'),
            unit='Meters',
            rate=Decimal('90'),
            amount=Decimal('450000'),
        )
        po3 = PurchaseOrder.objects.create(
            project=p2,
            supplier=supps[0],
            po_number='PO-2024-201',
            status='received',
            order_date=today - timedelta(days=50),
            expected_date=today - timedelta(days=45),
            notes='Cement Block B',
        )
        PurchaseOrderItem.objects.create(
            purchase_order=po3,
            description='Portland cement 50kg',
            quantity=Decimal('800'),
            unit='Nos',
            rate=Decimal('320'),
            amount=Decimal('256000'),
        )
        po4 = PurchaseOrder.objects.create(project=p5, supplier=supps[3], po_number='PO-2024-501', status='ordered', order_date=today - timedelta(days=10), expected_date=today + timedelta(days=20), notes='Hardware – doors and windows')
        PurchaseOrderItem.objects.create(purchase_order=po4, description='Door hinges and locks', quantity=Decimal('200'), unit='Sets', rate=Decimal('1200'), amount=Decimal('240000'))

        # Bills
        Bill.objects.create(
            project=p1,
            description='Cement supply – Fauji (PO-2024-101)',
            amount=Decimal('390000'),
            due_date=today - timedelta(days=30),
            status='paid',
            paid_date=today - timedelta(days=35),
        )
        Bill.objects.create(
            project=p1,
            description='Steel supply – advance',
            amount=Decimal('480000'),
            due_date=today + timedelta(days=14),
            expected_payment_date=today + timedelta(days=10),
            status='pending',
        )
        Bill.objects.create(
            project=p1,
            description='MEP – first milestone',
            amount=Decimal('27600'),
            due_date=today + timedelta(days=7),
            status='pending',
        )
        Bill.objects.create(
            project=p1,
            description='Tiling – material advance',
            amount=Decimal('35000'),
            due_date=today + timedelta(days=21),
            status='pending',
        )
        Bill.objects.create(project=p2, description='Site office utilities', amount=Decimal('45000'), due_date=today - timedelta(days=5), status='overdue')
        Bill.objects.create(
            project=p2,
            description='Cement – PO-2024-201',
            amount=Decimal('256000'),
            due_date=today - timedelta(days=20),
            status='paid',
            paid_date=today - timedelta(days=25),
        )
        Bill.objects.create(
            project=p2,
            description='Façade – mobilization',
            amount=Decimal('170000'),
            due_date=today + timedelta(days=25),
            status='pending',
        )
        Bill.objects.create(
            project=p3,
            description='Final retention release – Highway 2B',
            amount=Decimal('120000'),
            due_date=today + timedelta(days=45),
            status='pending',
        )
        Bill.objects.create(project=p5, description='Site fencing and security', amount=Decimal('185000'), due_date=today + timedelta(days=5), status='pending')
        Bill.objects.create(
            project=p5,
            description='Electrical – advance (Safe Electrics)',
            amount=Decimal('126000'),
            due_date=today + timedelta(days=12),
            status='pending',
        )

        # Equipment & allocations
        eq1 = Equipment.objects.create(name='Tower Crane TC-1', equipment_type='Crane', owner_type='hired')
        eq2 = Equipment.objects.create(name='Concrete Mixer CM-2', equipment_type='Mixer', owner_type='owned')
        eq3 = Equipment.objects.create(name='Generator 80kVA', equipment_type='Generator', owner_type='owned')
        eq4 = Equipment.objects.create(name='Excavator EX-1', equipment_type='Excavator', owner_type='hired')
        eq5 = Equipment.objects.create(name='Welding Set WS-2', equipment_type='Welding', owner_type='owned')
        EquipmentAllocation.objects.create(equipment=eq1, project=p1, from_date=today - timedelta(days=160), to_date=None, rate_per_day=Decimal('25000'))
        EquipmentAllocation.objects.create(equipment=eq2, project=p1, from_date=today - timedelta(days=150), to_date=None, rate_per_day=None)
        EquipmentAllocation.objects.create(equipment=eq3, project=p2, from_date=today - timedelta(days=80), to_date=None, rate_per_day=None)
        EquipmentAllocation.objects.create(equipment=eq4, project=p5, from_date=today - timedelta(days=25), to_date=None, rate_per_day=Decimal('35000'))
        EquipmentAllocation.objects.create(equipment=eq5, project=p1, from_date=today - timedelta(days=90), to_date=None, rate_per_day=None)

        # Equipment maintenance records
        EquipmentMaintenance.objects.create(
            equipment=eq1,
            maintenance_date=today - timedelta(days=20),
            maintenance_type='inspection',
            description='Monthly safety inspection and lubrication',
            cost=Decimal('15000'),
            next_due_date=today + timedelta(days=10),
            performed_by='In-house maintenance team',
        )
        EquipmentMaintenance.objects.create(
            equipment=eq4,
            maintenance_date=today - timedelta(days=5),
            maintenance_type='repair',
            description='Hydraulic hose replacement',
            cost=Decimal('22000'),
            next_due_date=today + timedelta(days=60),
            performed_by='OEM service contractor',
        )

        # Documents
        ProjectDocument.objects.create(project=p1, title='Architectural drawings – Ground to 4th', doc_type='drawing', revision='Rev 2', notes='Approved for construction')
        ProjectDocument.objects.create(project=p1, title='BOQ – Phase A', doc_type='boq', revision='Rev 1', notes='Bill of quantities')
        ProjectDocument.objects.create(project=p1, title='Structural contract – Al-Rahim', doc_type='contract', revision='', notes='Signed copy')
        ProjectDocument.objects.create(project=p2, title='NOC – Building control', doc_type='noc', revision='Final', notes='')
        ProjectDocument.objects.create(project=p2, title='Façade specification', doc_type='drawing', revision='Rev 1', notes='Cladding details')
        ProjectDocument.objects.create(project=p3, title='As-built drawings Section 2B', doc_type='drawing', revision='Rev 0', notes='Handover set')
        ProjectDocument.objects.create(project=p4, title='Site layout – Plot 5', doc_type='drawing', revision='Draft', notes='Pending approval')
        ProjectDocument.objects.create(project=p5, title='Electrical single line diagram', doc_type='drawing', revision='Rev 1', notes='')
        ProjectDocument.objects.create(project=p5, title='School BOQ – Block A', doc_type='boq', revision='Rev 0', notes='')

        # Daily logs & issues
        DailyLog.objects.create(project=p1, log_date=today - timedelta(days=1), weather='Sunny, 32°C', manpower_count=85, work_done='Slab casting 3rd floor; rebar fixing 4th; MEP conduit layout.', created_by=demo_user)
        DailyLog.objects.create(project=p1, log_date=today - timedelta(days=2), weather='Partly cloudy', manpower_count=82, work_done='Formwork 4th floor; steel delivery; quality checks.', created_by=demo_user)
        DailyLog.objects.create(project=p1, log_date=today - timedelta(days=3), weather='Clear', manpower_count=78, work_done='Concrete curing 3rd; rebar 4th; MEP rough-in.', created_by=demo_user)
        DailyLog.objects.create(project=p2, log_date=today - timedelta(days=1), weather='Clear', manpower_count=45, work_done='Column casting Block B; excavation for services.', created_by=demo_user)
        DailyLog.objects.create(project=p2, log_date=today - timedelta(days=2), weather='Hot', manpower_count=48, work_done='Formwork; steel fix; cladding material delivery.', created_by=demo_user)
        DailyLog.objects.create(project=p5, log_date=today - timedelta(days=1), weather='Sunny', manpower_count=32, work_done='Foundation excavation; setting out; temp power.', created_by=demo_user)
        Issue.objects.create(project=p1, title='Delay in steel delivery – 3rd floor', status='in_progress', severity='medium', is_ncr=False, created_by=demo_user)
        Issue.objects.create(project=p1, title='NCR – Concrete cube test below spec (Batch 12)', status='open', severity='high', is_ncr=True, created_by=demo_user)
        Issue.objects.create(project=p2, title='Design change – staircase reinforcement', status='closed', severity='low', is_ncr=False, created_by=demo_user)
        Issue.objects.create(project=p2, title='Cladding sample approval pending', status='open', severity='low', is_ncr=False, created_by=demo_user)
        Issue.objects.create(project=p5, title='Soil report – additional compaction required', status='in_progress', severity='medium', is_ncr=False, created_by=demo_user)

        # Progress photos (metadata only; image files are not included in the demo)
        first_phase_p1 = p1.phases.first()
        ProjectPhoto.objects.create(
            project=p1,
            phase=first_phase_p1,
            image='progress_photos/demo/p1_level3.jpg',
            caption='Level 3 slab casting in progress',
            photo_date=today - timedelta(days=2),
            uploaded_by=demo_user,
        )
        ProjectPhoto.objects.create(
            project=p1,
            phase=first_phase_p1,
            image='progress_photos/demo/p1_level4.jpg',
            caption='Rebar fixing for Level 4 slab',
            photo_date=today - timedelta(days=1),
            uploaded_by=demo_user,
        )
        ProjectPhoto.objects.create(
            project=p2,
            phase=None,
            image='progress_photos/demo/p2_front_elevation.jpg',
            caption='Front elevation – façade mock-up',
            photo_date=today - timedelta(days=3),
            uploaded_by=demo_user,
        )

        # Punch / snag list items
        PunchItem.objects.create(
            project=p1,
            title='Touch-up paint required – Level 3 corridors',
            description='Minor scratches near lift lobby and stair cores',
            location='Residential Tower A – Level 3',
            status='open',
            assigned_to=demo_user,
            due_date=today + timedelta(days=14),
            created_by=demo_user,
        )
        PunchItem.objects.create(
            project=p1,
            title='Door hardware adjustment – Apt 305',
            description='Entrance door rubbing on frame, adjust hinges/lockset',
            location='Apartment 305',
            status='in_progress',
            assigned_to=demo_user,
            due_date=today + timedelta(days=7),
            created_by=demo_user,
        )
        PunchItem.objects.create(
            project=p2,
            title='Glass cleaning – main façade',
            description='Final cleaning of all façade glass panels prior to handover',
            location='Block B – street elevation',
            status='open',
            assigned_to=None,
            due_date=today + timedelta(days=21),
            created_by=demo_user,
        )

        # Budgets (one per category per project where applicable)
        for proj in [p1, p2, p4, p5]:
            for cat, _ in EXPENSE_CATEGORIES:
                Budget.objects.create(
                    project=proj,
                    category=cat,
                    amount=Decimal('50000') if cat == 'other' else Decimal('200000'),
                    notes=f'Initial allocation for {proj.name}',
                )

        # Expenses & income
        Expense.objects.create(
            project=p1,
            category='materials',
            amount=Decimal('390000'),
            description='Cement – PO-2024-101',
            date=today - timedelta(days=35),
        )
        Expense.objects.create(project=p1, category='labor', amount=Decimal('450000'), description='Weekly labour wages', date=today - timedelta(days=7))
        Expense.objects.create(project=p1, category='equipment', amount=Decimal('250000'), description='Crane hire – 10 days', date=today - timedelta(days=14))
        Expense.objects.create(project=p1, category='labor', amount=Decimal('420000'), description='Labour – week 2', date=today - timedelta(days=14))
        Expense.objects.create(project=p1, category='materials', amount=Decimal('120000'), description='Formwork timber', date=today - timedelta(days=21))
        Expense.objects.create(project=p2, category='materials', amount=Decimal('320000'), description='Formwork material', date=today - timedelta(days=20))
        Expense.objects.create(
            project=p2,
            category='materials',
            amount=Decimal('256000'),
            description='Cement – PO-2024-201',
            date=today - timedelta(days=25),
        )
        Expense.objects.create(project=p2, category='labor', amount=Decimal('280000'), description='Site labour', date=today - timedelta(days=10))
        Expense.objects.create(project=p5, category='labor', amount=Decimal('195000'), description='Excavation crew', date=today - timedelta(days=5))
        Expense.objects.create(project=p5, category='equipment', amount=Decimal('175000'), description='Excavator – 5 days', date=today - timedelta(days=3))
        Income.objects.create(
            project=p1,
            amount=Decimal('50000'),
            description='Client advance – Phase A',
            date=today - timedelta(days=160),
        )
        Income.objects.create(
            project=p1,
            amount=Decimal('30000'),
            description='Milestone 1 payment',
            date=today - timedelta(days=100),
        )
        Income.objects.create(
            project=p2,
            amount=Decimal('80000'),
            description='Client advance – Block B',
            date=today - timedelta(days=85),
        )
        Income.objects.create(
            project=p3,
            amount=Decimal('150000'),
            description='Final certificate – Highway 2B',
            date=today - timedelta(days=45),
        )
        Income.objects.create(
            project=p5,
            amount=Decimal('25000'),
            description='Client mobilization',
            date=today - timedelta(days=25),
        )

        # Material catalog and project materials
        cement = Material.objects.create(company=company, name='Ordinary Portland Cement 50kg', unit='Bag', category='Cement', description='General purpose OPC')
        steel = Material.objects.create(company=company, name='Deformed Steel Bar 12mm', unit='Meter', category='Steel', description='Grade 60 deformed bar')
        sand = Material.objects.create(company=company, name='River Sand', unit='Cft', category='Aggregates', description='Washed river sand')
        blocks = Material.objects.create(company=company, name='Solid Concrete Block 6\"', unit='Nos', category='Blocks')

        ProjectMaterial.objects.create(
            project=p1,
            material=cement,
            quantity_required=Decimal('800.00'),
            quantity_used=Decimal('420.00'),
            reorder_level=Decimal('150.00'),
            notes='Tower A – foundations and lower floors',
        )
        ProjectMaterial.objects.create(
            project=p1,
            material=steel,
            quantity_required=Decimal('5200.00'),
            quantity_used=Decimal('2600.00'),
            reorder_level=Decimal('800.00'),
            notes='Reinforcement for slabs and beams',
        )
        ProjectMaterial.objects.create(
            project=p2,
            material=blocks,
            quantity_required=Decimal('6000.00'),
            quantity_used=Decimal('2100.00'),
            reorder_level=Decimal('1000.00'),
            notes='Internal and external walls',
        )

        # Notifications
        Notification.objects.create(
            user=demo_user,
            notification_type='bill_due',
            title='Bill due in 7 days',
            message='MEP – first milestone (PKR 27,600) due on ' + (today + timedelta(days=7)).isoformat(),
            read=False,
            link='/bills',
        )
        Notification.objects.create(
            user=demo_user,
            notification_type='bill_overdue',
            title='Overdue bill',
            message='Site office utilities (PKR 45,000) is overdue.',
            read=False,
            link='/bills',
        )
        Notification.objects.create(
            user=demo_user,
            notification_type='fund_transfer',
            title='Fund transfer completed',
            message='PKR 50,000 transferred from Highway Section 2B to Residential Tower Phase A.',
            read=True,
            link='/finances',
        )
        Notification.objects.create(user=demo_user, notification_type='project_milestone', title='Milestone completed', message='Foundation complete – Residential Tower Phase A.', read=True, link=f'/projects/{p1.id}')
        Notification.objects.create(
            user=demo_user,
            notification_type='bill_due',
            title='Bill due soon',
            message='Electrical advance (PKR 126,000) – School Building due in 12 days.',
            read=False,
            link='/bills',
        )
        Notification.objects.create(user=demo_user, notification_type='project_milestone', title='Milestone due', message='Foundation complete – School Building Block A due in 120 days.', read=False, link=f'/projects/{p5.id}')

        # Fund transfer
        FundTransfer.objects.create(
            from_project=p3,
            to_project=p1,
            amount=Decimal('50000'),
            transfer_date=today - timedelta(days=10),
            notes='Reallocation after Highway 2B closure',
        )
        FundTransfer.objects.create(
            from_project=p1,
            to_project=p2,
            amount=Decimal('30000'),
            transfer_date=today - timedelta(days=5),
            notes='Support Block B cash flow',
        )

        # Partners, investments & withdrawals
        hamza = Partner.objects.create(name='Hamza', company=company)
        sami = Partner.objects.create(name='Sami', company=company)
        ali = Partner.objects.create(name='Ali', company=company)
        ProjectInvestment.objects.create(
            project=p1,
            amount=Decimal('200000'),
            investment_date=today - timedelta(days=150),
            partner=hamza,
            description='Initial capital',
            created_by=demo_user,
        )
        ProjectInvestment.objects.create(
            project=p1,
            amount=Decimal('100000'),
            investment_date=today - timedelta(days=80),
            partner=sami,
            description='Additional investment',
            created_by=demo_user,
        )
        ProjectInvestment.objects.create(
            project=p2,
            amount=Decimal('150000'),
            investment_date=today - timedelta(days=70),
            partner=hamza,
            description='Block B capital',
            created_by=demo_user,
        )
        ProjectInvestment.objects.create(
            project=p2,
            amount=Decimal('80000'),
            investment_date=today - timedelta(days=40),
            partner=ali,
            description='Working capital',
            created_by=demo_user,
        )
        ProjectInvestment.objects.create(
            project=p5,
            amount=Decimal('50000'),
            investment_date=today - timedelta(days=28),
            partner=sami,
            description='School project seed',
            created_by=demo_user,
        )
        PartnerWithdrawal.objects.create(project=p1, partner=hamza, amount=Decimal('150000'), withdrawal_date=today - timedelta(days=30), description='Partner draw', created_by=demo_user)
        PartnerWithdrawal.objects.create(project=p1, partner=sami, amount=Decimal('100000'), withdrawal_date=today - timedelta(days=14), description='Partner draw', created_by=demo_user)
        PartnerWithdrawal.objects.create(project=p1, partner=hamza, amount=Decimal('75000'), withdrawal_date=today - timedelta(days=7), description='Monthly draw', created_by=demo_user)
        PartnerWithdrawal.objects.create(project=p2, partner=ali, amount=Decimal('50000'), withdrawal_date=today - timedelta(days=12), description='Expense reimbursement', created_by=demo_user)

        # RFIs (Requests for Information)
        RFI.objects.create(
            project=p1,
            rfi_number='RFI-001',
            title='Clarification on slab edge detail',
            description='Please confirm slab edge treatment at balcony level 4.',
            status='submitted',
            submitted_date=today - timedelta(days=3),
            created_by=demo_user,
        )
        RFI.objects.create(
            project=p2,
            rfi_number='RFI-002',
            title='HVAC grille locations – main lobby',
            description='Request confirmation of grille layout as per latest MEP drawings.',
            status='answered',
            submitted_date=today - timedelta(days=10),
            response_date=today - timedelta(days=5),
            response_text='Proceed as per MEP Rev 3, clouded area only.',
            created_by=demo_user,
        )

        # Safety incidents and toolbox talks
        SafetyIncident.objects.create(
            project=p1,
            title='Minor hand injury – rebar fixing',
            description='Worker sustained a small cut while tying rebar. First aid given, no lost time.',
            incident_date=today - timedelta(days=4),
            severity='low',
            location='Tower A – Level 2 slab',
            corrective_action='Re-brief crew on glove use; replace damaged gloves.',
            reported_by=demo_user,
        )
        SafetyIncident.objects.create(
            project=p2,
            title='Scaffolding tag missing',
            description='Daily inspection tag not updated on one scaffold bay.',
            incident_date=today - timedelta(days=2),
            severity='medium',
            location='Block B – east elevation',
            corrective_action='Tag updated, toolbox talk conducted with scaffold crew.',
            reported_by=demo_user,
        )
        ToolboxTalk.objects.create(
            project=p1,
            topic='Working at height – harness and edge protection',
            talk_date=today - timedelta(days=7),
            attendees_count=32,
            notes='Focus on full body harness usage and guardrails.',
            conducted_by=demo_user,
        )
        ToolboxTalk.objects.create(
            project=p5,
            topic='Excavation safety and traffic management',
            talk_date=today - timedelta(days=6),
            attendees_count=18,
            notes='Discussed trench protection and spotters for dumpers.',
            conducted_by=demo_user,
        )

        # Submittals
        Submittal.objects.create(
            project=p1,
            submittal_number='SUB-001',
            title='Aluminium window shop drawings',
            submittal_type='shop_drawing',
            description='Shop drawings for typical apartment windows, Tower A.',
            status='under_review',
            submitted_date=today - timedelta(days=5),
            created_by=demo_user,
        )
        Submittal.objects.create(
            project=p1,
            submittal_number='SUB-002',
            title='Tile sample – lobby floor',
            submittal_type='material',
            description='Polished porcelain tile, 600x600, light grey.',
            status='approved',
            submitted_date=today - timedelta(days=12),
            approved_date=today - timedelta(days=8),
            review_notes='Approved, use in lift lobbies and corridors.',
            created_by=demo_user,
        )

        self.stdout.write(self.style.SUCCESS('Demo data loaded successfully.'))
        self.stdout.write(f'  Projects: {len(projects)}, Parties: {len(all_parties)}, Contracts: {len(contracts)}')
        self.stdout.write(f'  Log in as your user to see notifications and full data.')

    def _clear_demo_data(self, company):
        """Remove demo data (only data linked to demo company); keep Company and Users."""
        demo_project_ids = list(Project.objects.filter(company=company).values_list('id', flat=True))
        if not demo_project_ids:
            return
        FundTransfer.objects.filter(from_project_id__in=demo_project_ids).delete()
        FundTransfer.objects.filter(to_project_id__in=demo_project_ids).delete()
        PartnerWithdrawal.objects.filter(project_id__in=demo_project_ids).delete()
        ProjectInvestment.objects.filter(project_id__in=demo_project_ids).delete()
        Partner.objects.filter(company=company).delete()
        Notification.objects.all().delete()
        Income.objects.filter(project_id__in=demo_project_ids).delete()
        Expense.objects.filter(project_id__in=demo_project_ids).delete()
        Budget.objects.filter(project_id__in=demo_project_ids).delete()
        Issue.objects.filter(project_id__in=demo_project_ids).delete()
        DailyLog.objects.filter(project_id__in=demo_project_ids).delete()
        ProjectDocument.objects.filter(project_id__in=demo_project_ids).delete()
        EquipmentAllocation.objects.filter(project_id__in=demo_project_ids).delete()
        Bill.objects.filter(project_id__in=demo_project_ids).delete()
        PurchaseOrder.objects.filter(project_id__in=demo_project_ids).delete()
        BankGuarantee.objects.filter(project_id__in=demo_project_ids).delete()
        Variation.objects.filter(project_id__in=demo_project_ids).delete()
        demo_contract_ids = list(Contract.objects.filter(project_id__in=demo_project_ids).values_list('id', flat=True))
        ContractPaymentSchedule.objects.filter(contract_id__in=demo_contract_ids).delete()
        Contract.objects.filter(project_id__in=demo_project_ids).delete()
        Party.objects.filter(company=company).delete()
        ProjectMilestone.objects.filter(project_id__in=demo_project_ids).delete()
        ProjectPhase.objects.filter(project_id__in=demo_project_ids).delete()
        Project.objects.filter(company=company).delete()
        # Remove equipment that have no allocations left
        Equipment.objects.filter(allocations__isnull=True).delete()
