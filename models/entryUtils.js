'use strict';

module.exports = {
  validateFields(next) {
    switch (this.type) {

      case 'text':
        if (!this.message) {
          return next(new Error('Text entry is missing a message'));
        }
        if (this.contents) {
          return next(new Error('Text entry has invalid contents'));
        }
        break;

      case 'photo':
      case 'audio':
      case 'video':
        if (!this.contents) {
          return next(new Error('Entry is missing contents'));
        }
        break;

      default:
        return next(new Error('Invalid entry type'));
    }

    next();
  },

  findEntries(params, count, page) {
    if (!params || !count || !page) {
      return Promise.reject(new Error('Invalid arguments'));
    }

    return this
      .find(params)
      .sort({ date: -1 })
      .skip(count * (page-1))
      .limit(count)
      .exec();
  }
};
