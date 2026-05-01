"""initial migration

Revision ID: 40041bedf4cc
Revises:
Create Date: 2026-05-01 16:26:41.343288

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '40041bedf4cc'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. 독립 테이블
    op.create_table('shift_types',
        sa.Column('shift_type_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('label', sa.String(length=20), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('color', sa.String(length=10), nullable=False),
        sa.Column('is_work_day', sa.Boolean(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('shift_type_id'),
        sa.UniqueConstraint('code'),
    )

    op.create_table('system_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('swap_years_range', sa.Integer(), nullable=False),
        sa.Column('max_consecutive_night', sa.Integer(), nullable=False),
        sa.Column('min_daily_staff', sa.Integer(), nullable=False),
        sa.Column('min_avg_years', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('users',
        sa.Column('user_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('employee_no', sa.String(length=50), nullable=False),
        sa.Column('role', sa.Enum('admin', 'employee', name='user_role'), nullable=False),
        sa.Column('years_of_experience', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('password', sa.String(length=255), nullable=False),
        sa.Column('is_initial_password', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('user_id'),
        sa.UniqueConstraint('employee_no'),
    )

    # 2. users, shift_types 의존 테이블
    op.create_table('schedules',
        sa.Column('schedule_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('work_date', sa.Date(), nullable=False),
        sa.Column('shift_type_id', sa.Integer(), nullable=False),
        sa.Column('is_locked', sa.Boolean(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['shift_type_id'], ['shift_types.shift_type_id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
        sa.PrimaryKeyConstraint('schedule_id'),
        sa.UniqueConstraint('user_id', 'work_date', name='uq_schedules_user_date'),
    )

    op.create_table('schedule_periods',
        sa.Column('period_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('confirmed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('confirmed_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['confirmed_by'], ['users.user_id']),
        sa.PrimaryKeyConstraint('period_id'),
        sa.UniqueConstraint('year', 'month', name='uq_schedule_periods_year_month'),
    )

    op.create_table('time_off_requests',
        sa.Column('request_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('requester_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('OFF', 'VAC', name='time_off_type'), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', 'canceled', name='time_off_status'), nullable=False),
        sa.Column('admin_comment', sa.Text(), nullable=True),
        sa.Column('canceled_by', sa.Integer(), nullable=True),
        sa.Column('cancel_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('processed_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['canceled_by'], ['users.user_id']),
        sa.ForeignKeyConstraint(['requester_id'], ['users.user_id']),
        sa.PrimaryKeyConstraint('request_id'),
    )

    # 3. 순환 FK 처리: swap_requests를 먼저 생성하되 accepted_proposal_id FK는 나중에 추가
    op.create_table('swap_requests',
        sa.Column('swap_request_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('requester_id', sa.Integer(), nullable=False),
        sa.Column('requester_schedule_id', sa.Integer(), nullable=False),
        sa.Column('requester_years_at_request', sa.Integer(), nullable=False),
        sa.Column('required_years_min', sa.Integer(), nullable=False),
        sa.Column('required_years_max', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'accepted', 'approved', 'rejected', 'expired', name='swap_request_status'), nullable=False),
        sa.Column('accepted_proposal_id', sa.Integer(), nullable=True),
        sa.Column('accepted_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('expires_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['requester_id'], ['users.user_id']),
        sa.ForeignKeyConstraint(['requester_schedule_id'], ['schedules.schedule_id']),
        sa.PrimaryKeyConstraint('swap_request_id'),
    )

    op.create_table('swap_proposals',
        sa.Column('swap_proposal_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('swap_request_id', sa.Integer(), nullable=False),
        sa.Column('proposer_id', sa.Integer(), nullable=False),
        sa.Column('proposer_schedule_id', sa.Integer(), nullable=False),
        sa.Column('proposer_years_at_proposal', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('proposed', 'selected', 'rejected', name='swap_proposal_status'), nullable=False),
        sa.Column('selected_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('rejected_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['proposer_id'], ['users.user_id']),
        sa.ForeignKeyConstraint(['proposer_schedule_id'], ['schedules.schedule_id']),
        sa.ForeignKeyConstraint(['swap_request_id'], ['swap_requests.swap_request_id']),
        sa.PrimaryKeyConstraint('swap_proposal_id'),
    )

    # 4. swap_requests.accepted_proposal_id → swap_proposals 순환 FK 후처리
    op.create_foreign_key(
        'fk_swap_requests_accepted_proposal',
        'swap_requests', 'swap_proposals',
        ['accepted_proposal_id'], ['swap_proposal_id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_swap_requests_accepted_proposal', 'swap_requests', type_='foreignkey')
    op.drop_table('swap_proposals')
    op.drop_table('swap_requests')
    op.drop_table('time_off_requests')
    op.drop_table('schedule_periods')
    op.drop_table('schedules')
    op.drop_table('users')
    op.drop_table('system_settings')
    op.drop_table('shift_types')
