from django.urls import path
from .views import SearchUserView

urlpatterns = [
    path('search/', SearchUserView.as_view(), name='user-search'),
]
