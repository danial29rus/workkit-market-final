from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = 'WorkKit Studio API'
    api_prefix: str = '/api'
    database_url: str = 'sqlite:///./workkit.db'
    frontend_origin: str = 'http://localhost:5173'
    admin_token: str = 'change-me-in-production'
    jwt_secret: str = 'change-this-long-random-secret-in-production'
    access_token_minutes: int = 720

    # Mulen Pay (https://docs.mulenpay.com). Payments are disabled while the keys are empty.
    mulenpay_base_url: str = 'https://api.mulenpay.com/api'
    mulenpay_api_key: str = ''
    mulenpay_secret_key: str = ''
    mulenpay_shop_id: int = 0
    # Optional: only needed if a callback URL is configured in Mulen Pay. Status polling works without it.
    mulenpay_callback_token: str = ''
    # How often (seconds) recent unpaid orders are checked in Mulen Pay. 0 turns the background check off.
    payment_sync_interval: int = 60

    # resell.codes supplier for gift-card codes. Without a key gift cards are delivered manually from the admin.
    resellcodes_api_key: str = ''
    resellcodes_base_url: str = 'https://resell.codes/api/v1'
    # Where to send alerts about failed deliveries / low balance. Defaults to SMTP_FROM.
    admin_alert_email: str = ''

    # SMTP for e-mail verification codes. While SMTP_HOST is empty, sign-up skips verification.
    smtp_host: str = ''
    smtp_port: int = 465
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_from: str = ''
    smtp_security: str = 'ssl'  # ssl (port 465) | starttls (port 587) | none
    email_code_minutes: int = 15

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    @property
    def payments_enabled(self) -> bool:
        return bool(self.mulenpay_api_key and self.mulenpay_secret_key and self.mulenpay_shop_id)

    @property
    def supplier_enabled(self) -> bool:
        return bool(self.resellcodes_api_key)

    @property
    def email_verification_enabled(self) -> bool:
        return bool(self.smtp_host)

settings = Settings()
