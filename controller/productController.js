const Category = require('../models/categoryModel');
const productModel = require('../models/productModel');
const path = require('path');
const fs = require('fs');

const loadProductList = async (req, res) => {
    try {
        const products = await productModel.find();
        const categories = await Category.find({is_listed: true});
        // console.log(products)
        res.render('products-list', {products, categories});
    } catch (error) {
        console.log(error);
    }
}

const loadAddProduct = async (req, res) => {
    try {
        const categories = await Category.find({is_listed: true});
        res.render('add-products', {categories});

    } catch (error) {
        console.log(error);
    }
}

const addProduct = async (req, res) => {
    try {
        const {productName, productDescription, productPrice, productStock, productCategory} = req.body;
        
        if(!productName || !productDescription || !productPrice || !productStock || !productCategory){
            return res.status(400).json({error: 'All fields are required'});
        }

        let imagePaths = [];
        if(req.files && req.files.length > 0){
            imagePaths = req.files.map(file => file.filename);
        } 
        // console.log(imagePaths);

        const newProduct = new productModel({
            name: productName,
            description: productDescription,
            price: productPrice,
            stock: productStock,
            category: productCategory,
            images: imagePaths
        });

        const savedProduct = await newProduct.save();

        if(savedProduct){
            res.status(200).json({message: 'New Product Added'});
        }else{
            res.status(400).json({error: 'Something went wrong!'});
        }

    } catch (error) {
        console.log(error);
    }
}

const listProduct = async (req, res) => {
    try {
        const {id} = req.query;
        const product = await productModel.findOne({_id: id});

        if(!product){
            return res.status(400).json({ success: true, message: 'Product not found!'});
        }

        if(product.is_listed){
            product.is_listed = false;
        }else{
            product.is_listed = true;
        }

        const save = await product.save();
        if(save){
            res.send({success: true});
        }else{
            res.send({success: false});
        }

    } catch (error) {
        console.log(error);
    }
}

const loadEditProduct = async (req, res) => {
    try {
        const id = req.params.id;
        // console.log(id);
        const product = await productModel.findById(id);
        const categories = await Category.find({is_listed: true});
        res.render('edit-product', {product, categories});
    } catch (error) {
        console.log(error);
    }
}

const editProduct = async (req, res) => {
    try {
        const {formData,files } = req.body;
        const productId = req.params.id;
        console.log(req.body);
                                    
        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            imagePaths = req.files.map((file) => file.filename);
        }
        console.log(files);

        const product = await productModel.findById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update fields
        product.name = formData.name;
        product.description = formData.description;
        product.price = formData.price;
        product.stock = formData.stock;
        product.category = formData.category;

        if(formData.deletedImages.length > 0){
            for(const image of formData.deletedImages){
                const imagePath = path.join(__dirname, '..', 'public', 'uploads', image);
                fs.unlink(imagePath, (error) => {
                    if(error){
                        console.error(`Error deleting image ${image}:`, error);
                    }else{
                        console.log(`Deleted image: ${imagePath}`);
                    }
                });
            }
            product.images = product.images.filter(image => !formData.deletedImages.includes(image));
            console.log(product.images);
        }

        // If new images are uploaded, replace the old ones
        if (formData.imageFiles && formData.imageFiles.length > 0) {
            const newImagePaths = formData.imageFiles.map((file) => file. filename);
            product.images = [...product.images, ...newImagePaths];
        }        
   
        const savedProduct = await product.save();

        if (savedProduct) {
            res.status(200).json({ message: 'Product updated successfully' });
        } else {
            res.status(400).json({ error: 'Failed to update product' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while editing the product' });
    }
};


module.exports = {
    loadProductList,
    loadAddProduct,
    addProduct,
    listProduct,
    loadEditProduct,
    editProduct
}