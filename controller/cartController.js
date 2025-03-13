const Cart = require('../models/cart');
const Product = require('../models/productModel');
const addressModel = require('../models/addressModel');
const Offer = require('../models/offerModel');
          
const addToCart = async (req, res) => {
    try {                          
        const userId = req.session.userid;

        if(!userId){
            return res.status(404).json({message: 'You are not loged in!'});
        }
                                         
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
            cart.items[itemIndex].quantity += quantity;

            if (cart.items[itemIndex].quantity > 5) {
                cart.items[itemIndex].quantity -= quantity;
                return res.status(400).json({ message:  "Product already in the cart" });
            }
        } else {
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


const updateCart = async (req, res) => {
    const { productId, newQuantity } = req.body;
    const userId = req.session.userid

    try {
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        if (newQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than zero' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex >= 0) {
            cart.items[itemIndex].quantity = newQuantity;
        } else {
            cart.items.push({ productId, quantity: newQuantity });
        }

        await cart.save();
        res.status(200).json({ success: true, message: 'Cart updated successfully', cart });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update cart' });
    }
};



const removeItem = async (req, res) => {
    try {
        const productId = req.params.id;
        const user = req.session.userid;
        const cartData = await Cart.findOne({userId: user});

        const productIndex = cartData.items.findIndex(item => item.productId.toString() === productId);
        // console.log(productIndex);
        
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
        let cartData = await Cart.findOne({userId: user})
        .populate({
            path: 'items.productId',
            select: ' _id name price category',
        });

        console.log('-----cardata before :', JSON.stringify(cartData, null, 2));

        const activeOffers = await Offer.find({
            status: true,
            expiryDate: { $gte: new Date() }
        });

        const cartItems = cartData.items.map(item => {
            const product = item.productId;
            let applicableOffer = null;
            let offerPrice = null;

            const productOffer = activeOffers.find(offer => offer.offerType === 'product' && offer.selectItem.equals(product._id));
            const categoryOffer = activeOffers.find(offer => offer.offerType === 'category' && offer.selectItem.equals(product.category._id));

            if(productOffer){
                applicableOffer = productOffer;
                offerPrice = product.price - (product.price * (productOffer.discountPercentage / 100));
                req.session.offerPrice = offerPrice;
            }else if(categoryOffer){
                applicableOffer = categoryOffer;
                offerPrice = product.price - (product.price * (categoryOffer.discountPercentage / 100));
                req.session.offerPrice = offerPrice;
            }else{
                req.session.offerPrice = product.price;
            }

            const finalPrice = offerPrice || product.price;

            return {
                name: product.name,
                quantity: item.quantity,
                price: product.price,
                finalPrice: finalPrice,
                totalPrice: item.quantity * finalPrice,
                discountPercentage: applicableOffer ? applicableOffer.discountPercentage : 0
            };
        });

        cartData = cartData.toObject();
        // const totalPrice = cartData.items.reduce((acc, item) => {
        //     const itemTotal = item.productId.price * (item.quantity || 1)
        //     return acc + itemTotal;
        // },0);

        // console.log('cartItems :', cartItems);

        const totalPrice = cartItems.reduce((total, item) => total + item.totalPrice, 0);
        cartData.items = cartItems;
        console.log('cart data aftere:', JSON.stringify(cartData, null, 2));

        res.render('checkout', {user, addresses, cartData, totalPrice});
    } catch (error) {
        console.log('Error in load checkout:', error.message);
        res.status(500).json({ message: 'An error occured', error: error.message});
    }
}

module.exports = {
    addToCart,
    removeItem,
    loadCheckout,
    updateCart
};
