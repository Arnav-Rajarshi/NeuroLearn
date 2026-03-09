from fastapi import FastAPI
import razorpay

app = FastAPI()

razorpay_client = razorpay.Client(auth=("rzp_test_SN8K7G4rOcDgUU","IZ73sQwcdjNulMRoHzKSjkw"))

@app.get("/create-order")
def create_order():
    order = razorpay_client.order.create({"amount" : 19900,
                                          "currency": "INR",
                                          "payment_capture": 1
                                          })
    return {"order_id": order["id"]}
