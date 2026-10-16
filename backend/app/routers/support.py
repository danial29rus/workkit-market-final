import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from ..db import get_db
from ..models import Customer, Order, SupportMessage, SupportTicket
from ..schemas import SupportMessageIn, SupportTicketCreate, SupportTicketOut
from ..security import current_customer

router = APIRouter(prefix='/support', tags=['support'])


def now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def ticket_query():
    return select(SupportTicket).options(
        selectinload(SupportTicket.messages), selectinload(SupportTicket.order), selectinload(SupportTicket.customer),
    )


def ticket_to_dict(ticket: SupportTicket, admin: bool = False) -> dict:
    data = {
        'public_id': ticket.public_id,
        'subject': ticket.subject,
        'category': ticket.category,
        'status': ticket.status,
        'order_public_id': ticket.order.public_id if ticket.order else None,
        'created_at': ticket.created_at,
        'updated_at': ticket.updated_at,
        'last_message_at': ticket.last_message_at,
        'messages': [
            {'id': message.id, 'sender': message.sender, 'body': message.body, 'created_at': message.created_at}
            for message in ticket.messages
        ],
    }
    if admin:
        data.update({'customer_name': ticket.customer.full_name, 'customer_email': ticket.customer.email})
    return data


def get_ticket(db: Session, public_id: str) -> SupportTicket | None:
    return db.scalar(ticket_query().where(SupportTicket.public_id == public_id))


def new_public_id(db: Session) -> str:
    while True:
        public_id = 'SUP-' + secrets.token_hex(4).upper()
        if not db.scalar(select(SupportTicket.id).where(SupportTicket.public_id == public_id)):
            return public_id


@router.get('/tickets', response_model=list[SupportTicketOut])
def customer_tickets(db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    tickets = db.scalars(ticket_query().where(SupportTicket.customer_id == customer.id).order_by(SupportTicket.last_message_at.desc())).unique()
    return [ticket_to_dict(ticket) for ticket in tickets]


@router.post('/tickets', response_model=SupportTicketOut)
def create_ticket(payload: SupportTicketCreate, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    order = None
    if payload.order_public_id:
        order = db.scalar(select(Order).where(Order.public_id == payload.order_public_id, Order.customer_id == customer.id))
        if not order:
            raise HTTPException(404, 'order_not_found')
    created = now()
    ticket = SupportTicket(
        public_id=new_public_id(db), customer_id=customer.id, order_id=order.id if order else None,
        subject=payload.subject.strip(), category=payload.category, status='open', created_at=created,
        updated_at=created, last_message_at=created,
    )
    db.add(ticket)
    db.flush()
    db.add(SupportMessage(ticket_id=ticket.id, sender='customer', body=payload.body.strip(), created_at=created))
    db.commit()
    return ticket_to_dict(get_ticket(db, ticket.public_id))


@router.post('/tickets/{public_id}/messages', response_model=SupportTicketOut)
def add_customer_message(public_id: str, payload: SupportMessageIn, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    ticket = get_ticket(db, public_id)
    if not ticket or ticket.customer_id != customer.id:
        raise HTTPException(404, 'ticket_not_found')
    created = now()
    ticket.status = 'open'
    ticket.last_message_at = created
    ticket.updated_at = created
    db.add(SupportMessage(ticket_id=ticket.id, sender='customer', body=payload.body.strip(), created_at=created))
    db.commit()
    return ticket_to_dict(get_ticket(db, public_id))
