const Category = require('../models/categoryModel');

const loadCategory = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('category', {categories});

    } catch (error) {
        console.log(error);
    }
}

const addCategory = async (req, res) => {
    try {
        const {categoryName, categoryDescription} = req.body;

        if(!categoryName || !categoryDescription){
            return res.status(400).json({error: 'All fields are required'});
        }

        const category = new Category({
            name: categoryName,
            description: categoryDescription
        });
       const saved = await category.save();

       if(saved){
        res.status(200).json({success:'data saved'});
       }else{
        res.status(400).json({error: 'error occurred'});
       }
    
    } catch (error) {
        console.log(error);
    }
}

const listCategory = async (req, res) => {
    try {
        const {id} = req.query;
        // console.log(req.query);
        const category = await Category.findOne({_id: id});

        if(!category){
            return res.status(400).json({ success: true, message: 'Category not found!'});
        }

        if (category.is_listed) {
            category.is_listed = false;
        }else{
            category.is_listed = true;
        }

        const save = await category.save();
        if(save){
            res.send({ success: true});
        }else{
            res.send({ success: false});
        }

    } catch (error) {
        console.log(error);
    }
}

const loadEditCategory = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);
        const category = await Category.findById(id);
        const categories = await Category.find({is_listed: true});
        res.render('edit-category', {category, categories});
    } catch (error) {
        console.log(error);
    }
}

const editCategory = async (req, res) => {
    try {
        const { formData } = req.body;
        const categoryId = req.params.id;

        const category = await Category.findById(categoryId);

        if(!category){
            return res.status(404).json({error: 'Category not found'});
        }

        //update fields
        category.name = formData.name;
        category.description = formData.description;
        // category.category = formData.category;

        const savedCategory = await category.save();

        if(savedCategory){
            res.status(200).json({message: 'Category updated successfully'});
            
        }else{
            res.status(400).json({error: 'Failed to update category'});
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'An error occurred while editing the category'});
        
    }
}

module.exports = {
    loadCategory,
    addCategory,
    listCategory,
    loadEditCategory,
    editCategory
}