import os
import tempfile

_TEST_DB = os.path.join(tempfile.gettempdir(), "idle_market_test.db")
if os.path.exists(_TEST_DB):
    os.remove(_TEST_DB)
os.environ["IDLE_MARKET_DB"] = _TEST_DB
os.environ["SECRET_KEY"] = "test-secret"
