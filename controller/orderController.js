const Cart = require('../models/cart');
const Order = require('../models/orderModel');
const Address = require('../models/addressModel');

const loadOrderList = async (req, res) => {
    try {
        const orders = await Order.find()
        .populate({
            path: 'userId'
        });
        res.render('orders-list', {orders});
    } catch (error) {
        console.log(error);
    }
}

const adminOrderDetails = async(req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
        .populate({
            path: 'userId address products.productId',
        });

        res.render('order-details', {order});
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

const placeOrder = async(req, res) => {
    try {
        const {selectedAddress, paymentOption} = req.body;
        const user = req.session.userid;

        const paymentType =  paymentOption == 'COD' ? 'Cash on Delivery (COD)' : paymentOption;

        const cartData = await Cart.findOne({userId: user})
        .populate({
            path: 'items.productId',
            select: '_id name price',
        });

        if(!cartData || cartData.items.length === 0){
            return res.status(400).json({ success: false, message: 'Cart is empty'});
        }

        const address = await Address.findById(selectedAddress);
        if(!address) {
            return res.status(400).json({ success: false, message: 'Invalid address selected.' });
        }

        let orderTotal = 0;
        cartData.items.forEach(item => {
            orderTotal += item.quantity * item.productId.price;
        });

        const newOrder = new Order({
            userId: user,
            address: selectedAddress,
            payment_type: paymentType,
            payment_status: 'Pending',
            order_status: 'Processing',
            shipping_type: 'Standard',
            products: cartData.items,
            order_total: orderTotal,
            return_status: 'Not initiated',
        });

        const saved = await newOrder.save();
        await Cart.updateOne({ userId: user}, {$set: { items: []}});

        if(saved){
            res.status(200).json({
                success: true,
                message: 'Order placed successfully!',
                orderId: newOrder._id,
            });
        }else{
            res.status(400).json({success: false});
        }
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({success: false, message: 'Server error.'});
    }
};

const orderList = async(req, res) => {
    try {
        const user = req.session.userid;
        const orders = await Order.find({userId: user});
        
        res.render('orderList', {user, orders});
    } catch (error) {
        console.error('Error in loadOrderList', error);
    }
}

const loadOrderDetails = async(req, res) => {
    try {
        const user = req.session.userid;
        const orderId = req.params.id;
        
        const order = await Order.findById(orderId)
        .populate({
            path: 'address products.productId',  
        });

        res.render('orderDetails', {user,order});
    } catch (error) {
        console.error('Error in loadOrderDetails', error);
    }
}

module.exports = {
    loadOrderList,
    adminOrderDetails,
    changeOrderStatus,
    placeOrder,
    orderList,
    loadOrderDetails
}