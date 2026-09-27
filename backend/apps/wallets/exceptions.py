class WalletException(Exception):
    """Base exception for wallet operations."""
    pass


class InsufficientFundsException(WalletException):
    """Raised when wallet does not have sufficient balance for a debit operation."""
    pass


class WalletFrozenException(WalletException):
    """Raised when attempting an operation on a frozen wallet."""
    pass


class WalletLimitExceededException(WalletException):
    """Raised when daily/monthly spending limit is exceeded."""
    pass
