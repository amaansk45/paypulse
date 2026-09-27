import logging
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError, AuthenticationFailed, NotAuthenticated, PermissionDenied, NotFound, MethodNotAllowed, Throttled

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Standardizes error responses across all DRF views and exceptions.
    Returns:
    {
        "success": False,
        "message": "Human readable summary",
        "errors": { ... detailed field or validation errors ... }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        errors = {}
        message = "An error occurred while processing your request."

        if isinstance(response.data, dict):
            if "detail" in response.data:
                message = str(response.data["detail"])
                errors = response.data
            elif "errors" in response.data:
                errors = response.data.get("errors", {})
                message = response.data.get("message", message)
            else:
                # Field-level validation errors
                errors = response.data
                first_key = next(iter(response.data.keys()))
                first_val = response.data[first_key]
                if isinstance(first_val, list) and len(first_val) > 0:
                    message = f"{first_key}: {first_val[0]}"
                else:
                    message = f"Validation error on {first_key}."
        elif isinstance(response.data, list):
            message = str(response.data[0]) if response.data else "Validation error."
            errors = {"non_field_errors": response.data}
        else:
            message = str(response.data)

        # Clean standard error message mappings
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            if not message or message == "Validation error.":
                message = "Authentication credentials were not provided or have expired."
        elif response.status_code == status.HTTP_403_FORBIDDEN:
            if not message or message == "Validation error.":
                message = "You do not have permission to perform this action."
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            if not message or message == "Validation error.":
                message = "The requested resource was not found."
        elif response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            message = "Too many requests. Please slow down and try again shortly."

        custom_response_data = {
            "success": False,
            "message": message,
            "errors": errors
        }
        return Response(custom_response_data, status=response.status_code)

    # If unhandled server exception (500)
    logger.exception("Unhandled server exception: %s", exc)
    error_message = str(exc) if settings.DEBUG else "Internal server error. Please try again later."

    return Response(
        {
            "success": False,
            "message": error_message,
            "errors": {"server_error": [str(exc)] if settings.DEBUG else []}
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
