from enum import Enum
class A(str, Enum):
    P = 'pending'
print(A.P == 'pending')
print({ 'pending': 5 }.get(A.P))
