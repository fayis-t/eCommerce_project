const Cart = require('../models/cart');
const Product = require('../models/productModel');
const addressModel = require('../models/addressModel');
          
const addToCart = async (req, res) => {
    try {                           
        const userId = req.session.userid;
                                         
        const { productId, quantity } = req.body;
      
        const productData = await Product.findOne({   
            _id: productId,
            is_listed: true
        });

        if (!productData) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (productData.stock === 0) {
            return res.status(400).json({ message: 'Product out of stock' });
        }

        if (productData.stock < quantity) {
            return res.status(400).json({ message: `Only ${productData.stock} stocks available` });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        if (quantity <= 0) {
            return res.status(400).json({ message: "Quantity must be a positive number greater than 0." });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex > -1) {
            // Product already exists, update quantity
            cart.items[itemIndex].quantity += quantity;

            // Ensure the quantity doesn't exceed the limit
            if (cart.items[itemIndex].quantity > 5) {
                cart.items[itemIndex].quantity -= quantity; // Roll back the addition
                return res.status(400).json({ message:  "Product already in the cart" });
            }
        } else {
            // Add new product if quantity is valid
            if (quantity > 5) {
                return res.status(400).json({ message: "You can buy only up to 5 unit(s) of this product." });
            }
            cart.items.push({ productId, quantity });
        }


        const saved = await cart.save();

        // Update product stock
        productData.stock -= quantity;
        await productData.save();

        if (saved) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ success: false });
        }

    } catch (error) {
        console.error('Error in addToCart:', error.message);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
};

const removeItem = async (req, res) => {
    try {
        const productId = req.params.id;
        const user = req.session.userid;
        const cartData = await Cart.findOne({userId: user});

        const productIndex = cartData.items.findIndex(item => item.productId.toString() === productId);
        console.log(productIndex);
        
        const removed = cartData.items.splice(productIndex-1, 1);  

        const saved = await cartData.save();
        if(saved){
            res.status(200).json({success: true});
        }else{
            res.status(400).json({success: false});
        }

    } catch (error) {
        console.log('Error in remove item from cart:', error.message);
        res.status(500).json({ message: 'An error occurred', error: error.message});
    }
}


const loadCheckout = async (req,res) => {
    try {
        const user = req.session.userid;
        const addresses = await addressModel.find({userId: user});
        const cartData = await Cart.findOne({userId: user})
        .populate({
            path: 'items.productId',
            select: ' _id name price',
        });

        const totalPrice = cartData.items.reduce((acc, item) => {
            const itemTotal = item.productId.price * (item.quantity || 1)
            return acc + itemTotal;
        },0);

        res.render('checkout', {user, addresses, cartData, totalPrice});
    } catch (error) {
        console.log('Error in load checkout:', error.message);
        // res.status(500).json({ message: 'An error occured', error: error.message});
    }
}

module.exports = {
    addToCart,
    removeItem,
    loadCheckout
};
