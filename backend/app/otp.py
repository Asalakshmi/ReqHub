import hashlib
import hmac
import os
import secrets

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")

CODE_LIFETIME_MINUTES = 10
RESEND_SECONDS = 60
MAX_ATTEMPTS = 5


def new_code() -> str:
    # secrets is built for security; random is not
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_code(email: str, code: str) -> str:
    message = f"{email}:{code}".encode("utf-8")
    return hmac.new(SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def code_matches(email: str, code: str, stored_hash: str) -> bool:
    # compare_digest takes the same time however many characters match
    return hmac.compare_digest(hash_code(email, code), stored_hash)