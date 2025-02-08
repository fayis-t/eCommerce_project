const Coupon = require('../models/couponModel');
const offerModel = require('../models/offerModel');


const loadCouponPage = async (req, res) => {
    try {
        const coupons = await Coupon.find();

        res.render('add-coupon', {coupons});
    } catch (error) {
        console.log('Error on loading coupon page: ', error);
        res.status(500).json({ error: 'Failed to load coupon page' });
    }
}

const addCoupon = async (req, res) => {
    try {
        const { name, percentage, couponCode, minimumAmount, maxredeemAmount, expires, status } = req.body;
        
        if(!name || !percentage || !couponCode || !minimumAmount || !maxredeemAmount || !expires || !status === undefined){
            return res.status(404).json({ success: false, error: 'All fields are required' });
        }

        const existingCoupon = await Coupon.findOne({ couponCode });

        if(existingCoupon){
            return res.status(404).json({ success: false, error: 'Coupon code already exists' });
        }

        const newCoupon = new Coupon({
            name,
            percentage,
            couponCode,
            minimumAmount,
            maxredeemAmount,
            expires: new Date(expires),
            status
        });

        await newCoupon.save();

        res.status(200).json({ success: true, data: newCoupon, message: 'Coupon added succefully' });

    } catch (error) {
        console.log('Error on adding coupon: ', error);
        res.status(500).json({ error: 'Failed to add coupon' });
    }
}

const couponStatus = async(req, res) => {
    try {
        const { couponId } = req.params;
        const coupon = await Coupon.findById(couponId);

        if(!coupon){
            return res.status(404).json({ success: false, error: 'Coupon not found' });
        }

        coupon.status = !coupon.status;

        const updatedCoupon = await coupon.save();

        res.status(200).json({ success: true, message: `Coupon status updated to ${updatedCoupon.status ? 'Active' : 'Deactive'}` });

    } catch (error) {
        console.log('Error on update status: ', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
}


const deleteCoupon = async(req, res) => {
    try {
        const couponId = req.params.couponId;
        
        if(!couponId){
            return res.status(404).json({ success: false, error: 'Offer Id is required' });
        }

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        
        if(!deletedCoupon){
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        console.log('Error on deleting coupon:', error);
        res.status(500).json({ success: false, error: 'Failed to delete coupon. please try again.' });
    }
}

module.exports = {
    loadCouponPage,
    addCoupon,
    couponStatus,
    deleteCoupon
}