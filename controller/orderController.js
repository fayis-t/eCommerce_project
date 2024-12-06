const loadOrderList = async (req, res) => {
    try {
        res.render('orders-list');
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    loadOrderList
}