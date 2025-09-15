const fs = require('fs').promises;
const path = require('path');
const Website = require('../models/Website');

class WebsiteStorage {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'websites.json');
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      try {
        await fs.access(this.filePath);
      } catch (error) {
        // 檔案不存在，建立空檔案
        await fs.writeFile(this.filePath, JSON.stringify([], null, 2));
        console.log('已建立網站存儲檔案');
      }
    } catch (error) {
      console.error('初始化存儲失敗:', error);
    }
  }

  async loadData() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const websitesData = JSON.parse(data);
      return websitesData.map(data => new Website(data));
    } catch (error) {
      console.error('載入網站資料失敗:', error);
      return [];
    }
  }

  async saveData(websites) {
    try {
      const data = websites.map(website => website.toJSON());
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('儲存網站資料失敗:', error);
      throw error;
    }
  }

  async getAll() {
    return await this.loadData();
  }

  async getById(id) {
    const websites = await this.loadData();
    return websites.find(website => website.id === id) || null;
  }

  async create(websiteData) {
    const websites = await this.loadData();
    const website = new Website(websiteData);
    
    // 檢查是否已存在相同 URL
    const existing = websites.find(w => w.url === website.url);
    if (existing) {
      throw new Error('此 URL 已存在於監控列表中');
    }
    
    websites.push(website);
    await this.saveData(websites);
    
    console.log(`新增網站: ${website.url}`);
    return website;
  }

  async update(id, updateData) {
    const websites = await this.loadData();
    const index = websites.findIndex(website => website.id === id);
    
    if (index === -1) {
      throw new Error('找不到指定的網站');
    }
    
    // 更新資料
    const updatedWebsite = new Website({
      ...websites[index].toJSON(),
      ...updateData,
      id, // 確保 ID 不被更改
      updatedAt: new Date().toISOString()
    });
    
    websites[index] = updatedWebsite;
    await this.saveData(websites);
    
    console.log(`更新網站: ${updatedWebsite.url}`);
    return updatedWebsite;
  }

  async delete(id) {
    const websites = await this.loadData();
    const index = websites.findIndex(website => website.id === id);
    
    if (index === -1) {
      throw new Error('找不到指定的網站');
    }
    
    const deletedWebsite = websites[index];
    websites.splice(index, 1);
    await this.saveData(websites);
    
    console.log(`刪除網站: ${deletedWebsite.url}`);
    return deletedWebsite;
  }

  async getStats() {
    const websites = await this.loadData();
    const total = websites.length;
    const enabled = websites.filter(w => w.enabled).length;
    const disabled = websites.filter(w => !w.enabled).length;
    
    // 只統計啟用中的網站狀態
    const enabledWebsites = websites.filter(w => w.enabled);
    const healthy = enabledWebsites.filter(w => w.status === 'healthy').length;
    const unhealthy = enabledWebsites.filter(w => w.status === 'unhealthy').length;
    const pending = enabledWebsites.filter(w => w.status === 'pending').length;
    
    return {
      total,
      enabled,
      disabled,
      healthy,
      unhealthy,
      pending
    };
  }
}

module.exports = WebsiteStorage;