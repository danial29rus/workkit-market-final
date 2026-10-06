import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from . import fulfilment, payment_sync
from .routers import admin, auth, catalog, orders, payments, site

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')



@asynccontextmanager
async def lifespan(_: FastAPI):
    tasks = [asyncio.create_task(fulfilment.run_forever())]
    if settings.payment_sync_interval > 0:
        tasks.append(asyncio.create_task(payment_sync.run_forever()))
    yield
    for task in tasks:
        task.cancel()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/health')
def health():
    return {'status': 'ok'}

app.include_router(site.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(catalog.router, prefix=settings.api_prefix)
app.include_router(orders.router, prefix=settings.api_prefix)
app.include_router(payments.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
