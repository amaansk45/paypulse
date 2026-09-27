from rest_framework.response import Response
from rest_framework import status


def api_success(data=None, message="Operation successful", status_code=status.HTTP_200_OK, **kwargs):
    """
    Standardized success API response.
    """
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }
    payload.update(kwargs)
    return Response(payload, status=status_code)


def api_error(message="An error occurred", errors=None, status_code=status.HTTP_400_BAD_REQUEST, **kwargs):
    """
    Standardized error API response.
    """
    payload = {
        "success": False,
        "message": message,
        "errors": errors if errors is not None else {}
    }
    payload.update(kwargs)
    return Response(payload, status=status_code)
