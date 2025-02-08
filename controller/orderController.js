const Cart = require('../models/cart');
const Order = require('../models/orderModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');

const razorpay = require('razorpay');
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
const crypto = require('crypto');
const userModel = require('../models/userModel');
const Transaction = require('../models/transactionModel');

const loadOrderList = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate({
                path: 'userId'
            });
        res.render('orders-list', { orders });
    } catch (error) {
        console.log(error);
    }
}

const adminOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate({
                path: 'userId shipping_address products.productId',
            });

        res.render('order-details', { order });
    } catch (error) {
        console.log(error);
    }
}

const changeOrderStatus = async (req, res) => {

    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    try {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { order_status: status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/------------------------------------------------user place order------------------------------------------------------------------------/

const placeOrder = async (req, res) => {
    try {
        const { selectedAddress, paymentOption } = req.body;
        const user = req.session.userid;

        const paymentType = paymentOption == 'COD' ? 'Cash on Delivery (COD)' : paymentOption;

        const cartData = await Cart.findOne({ userId: user })
            .populate({
                path: 'items.productId',
                select: '_id name price',
            });

        if (!cartData || cartData.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        const address = await Address.findById(selectedAddress);
        if (!address) {
            return res.status(400).json({ success: false, message: 'Invalid address selected.' });
        }

        let orderTotal = 0;
        cartData.items.forEach(item => {
            orderTotal += item.quantity * item.productId.price;
        });

        const shipping_address = {
            name: address.name,
            address: address.address,
            country: address.country,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            mobile: address.mobile,
        }

        const newOrder = new Order({
            userId: user,
            shipping_address: shipping_address,
            payment_type: paymentType,
            payment_status: 'Pending',
            order_status: 'Processing',
            shipping_type: 'Standard',
            products: cartData.items,
            order_total: orderTotal,
            return_status: 'Not initiated',
        });

        const saved = await newOrder.save();
        await Cart.updateOne({ userId: user }, { $set: { items: [] } });

        if (paymentType === 'COD' && saved) {
            res.status(200).json({
                success: true,
                message: 'Order placed by COD',
                orderId: newOrder._id,
            });
        } else if (paymentType === 'Razorpay') {

            const razorpayOrder = await razorpayInstance.orders.create({
                amount: orderTotal * 100,
                currency: 'INR',
                receipt: `RECEIPT_IS ${newOrder._id}`
            });
            res.status(200).json({
                message: 'Ordered by Razor',
                razorpayOrderId: razorpayOrder.id,
                userName: address.name,
                orderId: newOrder._id,
                amount: orderTotal,
                currency: 'INR',
                key: process.env.RAZORPAY_KEY_ID
            });
        }
        else {
            res.status(400).json({ success: false });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

const confirmPayment = async (req, res) => {
    try {
        const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpaySignature) {
            order.payment_status = 'Paid';
            order.order_status = 'Confirmed';
            await order.save();

            res.status(200).json({ message: 'Success', orderId: order._id });
        } else {
            console.log('else is working!');
            res.status(400).json({ message: 'Invalid signature' });
        }

    } catch (error) {
        console.log(`error from the checkout controller confirm payment = ${error}`);
    }
}

const orderList = async (req, res) => {
    try {
        const user = req.session.userid;
        const orders = await Order.find({ userId: user }).sort({ createdAt: -1 });

        res.render('orderList', { user, orders });
    } catch (error) {
        console.error('Error in loadOrderList', error);
    }
}

const loadOrderDetails = async (req, res) => {
    try {
        const user = req.session.userid;
        const orderId = req.params.id;

        const order = await Order.findById(orderId)
            .populate({
                path: 'products.productId',
            });

        res.render('orderDetails', { user, order });
    } catch (error) {
        console.error('Error in loadOrderDetails', error);
    }
}



const cancelOrder = async (req, res) => {
    try {
        const { productId, orderId } = req.body;
        const userId = req.session.userid;

        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: orderId,
                "products.productId": productId
            },
            {
                $set: { "products.$.is_canceled": true }
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order or product not found" });
        }

        const canceledProduct = updatedOrder.products.find(
            (product) => product.productId.toString() === productId
        );

        if (!canceledProduct) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        const updatedProduct = await Product.findOneAndUpdate(
            {
                _id: productId
            },
            {
                $inc: { stock: canceledProduct.quantity }
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (updatedOrder.payment_type === 'Razorpay' && updatedOrder.payment_status === 'Paid') {
            const refundAmount = updatedOrder.order_total;
            const user = await userModel.findById(userId)
            user.wallet += refundAmount;
            await user.save();

            const transaction = new Transaction({
                userId: userId,
                amount: refundAmount,
                type: 'credit'
            });

            await transaction.save();
            updatedOrder.payment_status = 'Refund';
        }

        const allProductsCanceled = updatedOrder.products.every(
            (product) => product.is_canceled
        );

        if (allProductsCanceled) {
            updatedOrder.order_status = 'Canceled';
            await updatedOrder.save();
        }

        res.status(200).json({ success: true, message: "Product canceled successfully", order: updatedOrder, product: updatedProduct });
    } catch (error) {
        console.error("Error in cancelOrder:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


const returnOrder = async (req, res) => {
    try {
        const {productId, orderId} = req.body;
        const userId = req.session.userid;

        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: orderId,
                'products.productId': productId
            },
            {
                $set: {'products.$.is_returned': true}
            },
            { new: true}
        );

        if(!updatedOrder){
            return res.status(404).json({ success: false, message: 'order or product not found' });
        }

        const returnedProduct = updatedOrder.products.find(
            (product) => product.productId.toString() === productId
        );

        if(!returnedProduct){
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        const updatedProduct = await Product.findOneAndUpdate(
            {
                _id: productId
            },
            {
                $inc: { stock: returnedProduct.quantity }
            },
            {new: true}
        );

        if(!updatedProduct){
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const allProductReturned = updatedOrder.products.every(
            (product) => product.is_returned
        );
        console.log(allProductReturned);
        
        if(allProductReturned){
            updatedOrder.order_status = 'Returned';
            await updatedOrder.save();
        }

        res.status(200).json({ success: true, message: 'Product returned successfully', order: updatedOrder, product: updatedProduct });
    } catch (error) {
        console.log('Error in returnOrder:', error);
        res.status(500).json({ message: 'Internal server error'});
    }
}

const continuePayment = async(req, res) => {
    try {
        const orderId = req.body.orderId;
        const order = await Order.findById(orderId);
        const orderTotal = order.order_total;
       
        if(order.payment_type === 'Razorpay'){
            const razorpayOrder = await razorpayInstance.orders.create({
                amount: orderTotal * 100,
                currency: 'INR',
                receipt: `RECEIPT_IS ${order?._id}`
            });
            res.status(200).json({
                message: 'Ordered by Razor',
                razorpayOrderId: razorpayOrder.id,
                userName: order.shipping_address?.name,
                orderId: order._id,
                amount: orderTotal,
                currency: 'INR',
                key: process.env.RAZORPAY_KEY_ID
            });
        }else{
            res.status(400).json( {success: false });
        }

    } catch (error) {
        console.log('error on continue payment:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
}

module.exports = {
    loadOrderList,
    adminOrderDetails,
    changeOrderStatus,
    placeOrder,
    confirmPayment,
    orderList,
    loadOrderDetails,
    cancelOrder,
    returnOrder,
    continuePayment
}