const express = require('express');
const router = express();
const { adminLogin, loadDashboard, loadUserList, blockUser, loadLogin } = require('../controller/adminController');
const { loadCategory, addCategory, listCategory, editCategory, loadEditCategory } = require('../controller/categoryController');
const { loadProductList, loadAddProduct, addProduct, loadEditProduct, editProduct, listProduct } = require('../controller/productController');
const { loadOrderList, adminOrderDetails, changeOrderStatus } = require('../controller/orderController');
const { uploadMultiple } = require('../middlewares/multer');
const { ensureAdmin } = require('../middlewares/auth');

router.set('view engine', 'ejs');
router.set('views', './view/adminPages');


router.get('/', loadLogin);
router.post('/login', adminLogin);
router.get('/dashboard', ensureAdmin, loadDashboard);

router.get('/userList', ensureAdmin, loadUserList);
router.post('/blockUser', ensureAdmin, blockUser);

router.get('/category', ensureAdmin, loadCategory);
router.post('/addCategory', ensureAdmin, addCategory);
router.post('/listCategory', ensureAdmin, listCategory);

router.get('/editCategory/:id',ensureAdmin, loadEditCategory);
router.post('/editCategory/:id', ensureAdmin, editCategory);

router.get('/addProduct', ensureAdmin, loadAddProduct);
router.post('/addProduct', ensureAdmin, uploadMultiple, addProduct);
router.get('/products', ensureAdmin, loadProductList);
router.post('/listProduct', ensureAdmin, listProduct);

router.get('/editProduct/:id', ensureAdmin, loadEditProduct);
router.post('/editProduct/:id', ensureAdmin, uploadMultiple, editProduct);

router.get('/orders', ensureAdmin, loadOrderList);
router.get('/orderDetails/:id', ensureAdmin, adminOrderDetails);
router.post('/api/orders/:orderId/status', changeOrderStatus);

module.exports = router;