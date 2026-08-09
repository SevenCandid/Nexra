from fastapi.encoders import jsonable_encoder
try:
    print(jsonable_encoder({"activity": [], "networks": {None: 1}}))
except Exception as e:
    print("Error:", e)
