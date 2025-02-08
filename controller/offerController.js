const Offer = require('../models/offerModel');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');

const loadOfferPage = async (req, res) => {
    try {
        const offers = await Offer.find({})
            .populate('selectItem', 'name')
            .exec();

        const offersWithNames = offers.map(offer => ({
            ...offer._doc,
            selectedItemName: offer.selectItem ? offer.selectItem.name : `N/A`
        }));

        res.render('add-offer', {offers: offersWithNames});
    } catch (error) {
        console.log('Error on loading offer page:', error);
        res.status(500).json({ error: 'Failed to load offer ' });
    }
}

const getItem = async(req, res) => {
    try {
        const type = req.query.type;

        if(type === 'category'){
            const  categories = await Category.find({});
            res.json({ items: categories.map(cat => ({ id: cat._id, name: cat.name })) });
        }else if(type === 'product'){
            const products = await Product.find({});
            res.json({ items: products.map(prod =>({ id: prod._id, name: prod.name })) });
        }else{
            res.status(404).json({ success: false, error: 'Invalid type specified' });
        }


    } catch (error) {
        console.log('Error on get items: ', error);
        res.status(500).json({ error: 'Failed to get items' });
    }
}

const addOffer = async(req, res) => {
    try {
        const {offerName, discountPercentage, offerType, expiryDate, selectItem} = req.body;

        if(!offerName || !discountPercentage || !offerType || !expiryDate || !selectItem){
            return res.status(404).json({ success: false, error: 'All fiels are required' });
        }
        
        const existingOffer = await Offer.findOne({ selectItem, offerType });
        if(existingOffer){
            return res.status(404).json({ success: false, error: 'An offer already exists for this item' });
        }

        const item = await Product.findById(selectItem) || await Category.findById(selectItem);
        if(!item){
            return res.status(404).json({ success: false, error: 'Selected item not found' });
        }

        const newOffer = new Offer({
            offerName,
            discountPercentage,
            offerType,
            expiryDate,
            selectItem
        });
        await newOffer.save();

        res.status(200).json({ success: true, data: newOffer, selectedItemName: item.name });

    } catch (error) {
        console.log('Error on adding offer :', error);
        res.status(500).json({error: 'Failed to add offer'});
    }
}

const toggleOfferStatus = async(req, res) => {
    try {
        const {offerId} = req.params;

        const offer = await Offer.findById(offerId);

        if(!offer){
            return res.status(404).send('Offer not found');
        }

        offer.status = !offer.status;
        console.log('hereee:', offer.status);

        await offer.save();

        res.status(200).json({ success: true, message: 'Offer status updated successfully', offer: offer });

    } catch (error) {
        console.log('Error on update status: ', error);
        res.status(500).json({error: 'Failed to update Status'});
    }
}

const deleteOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId;

        if(!offerId){
            return res.status(404).json({ success: false, error: 'Offer ID is required' });
        }

        const deletedOffer = await Offer.findByIdAndDelete(offerId);

        if(!deletedOffer){
            return res.status(404).json({ success: false, error: 'Offer not found' });
        }

        res.status(200).json({ success: true, message: 'Offer deleted successfully' });
        
    } catch (error) {
        console.log('Error on deleting offer :', error);
        res.status(500).json({ error: 'Failed to delete offer' })
    }

}

module.exports = {
    loadOfferPage,
    getItem,
    addOffer,
    toggleOfferStatus,
    deleteOffer
}