Component({
  properties: {
    level: {type: String, value: 'primary'}, categories: {type: Array, value: []}, districts: {type: Array, value: []},
    categoryId: {type: String, value: ''}, county: {type: String, value: ''}, order: {type: String, value: 'smart'}, orderChosen: {type: Boolean, value: false}
  },
  data: {open: '', categoryLabel: '类别', categoryDisabled: false, orderLabel: '排序', orders: [{value: 'smart', name: '智能排序'}, {value: 'distance', name: '离我最近'}, {value: 'sale', name: '销量最多'}]},
  observers: {
    'categories, categoryId, order, orderChosen, level': function(categories, id, order, chosen, level) {
      const found = categories.find(item => String(item.id) === String(id));
      const sort = this.data.orders.find(item => item.value === order);
      const categoryDisabled = level === 'secondary' && categories.length === 0;
      this.setData({categoryDisabled, categoryLabel: categoryDisabled ? '全部' : found ? found.name : '类别', orderLabel: chosen && sort ? sort.name : '排序'});
      if (categoryDisabled && this.data.open === 'categoryId') this.setData({open: ''});
    }
  },
  methods: {
    toggle(event) { const field = event.currentTarget.dataset.field; if (field === 'categoryId' && this.data.categoryDisabled) return; this.setData({open: this.data.open === field ? '' : field}); },
    close() { this.setData({open: ''}); },
    choose(event) { const {field, value} = event.currentTarget.dataset; this.setData({open: ''}); this.triggerEvent('change', {field, value: String(value || '')}); }
  }
});
