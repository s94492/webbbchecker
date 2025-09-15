const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer用於文件上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 保持原始文件擴展名
    const ext = path.extname(file.originalname);
    cb(null, 'logo' + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 檢查文件類型
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片文件'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB限制
  }
});

// Logo設定路由

// 上傳Logo
router.post('/logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '沒有上傳文件'
      });
    }

    const logoPath = `/uploads/${req.file.filename}`;
    
    // 保存logo配置到JSON文件
    const configPath = path.join(__dirname, '../../config/logo.json');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const logoConfig = {
      enabled: true,
      path: logoPath,
      filename: req.file.filename,
      uploadDate: new Date().toISOString()
    };
    
    fs.writeFileSync(configPath, JSON.stringify(logoConfig, null, 2));
    
    console.log('Logo上傳成功:', logoPath);
    
    res.json({
      success: true,
      logoPath: logoPath,
      message: 'Logo上傳成功'
    });
    
  } catch (error) {
    console.error('Logo上傳失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 獲取當前Logo
router.get('/logo', (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../config/logo.json');
    
    if (fs.existsSync(configPath)) {
      const logoConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // 檢查文件是否仍然存在
      const fullPath = path.join(__dirname, '../..', logoConfig.path.replace('/', ''));
      if (fs.existsSync(fullPath)) {
        res.json({
          success: true,
          logo: logoConfig
        });
      } else {
        // 文件不存在，清除配置
        fs.unlinkSync(configPath);
        res.json({
          success: true,
          logo: null
        });
      }
    } else {
      res.json({
        success: true,
        logo: null
      });
    }
  } catch (error) {
    console.error('獲取Logo配置失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 刪除Logo
router.delete('/logo', (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../config/logo.json');
    
    if (fs.existsSync(configPath)) {
      const logoConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // 刪除文件
      const fullPath = path.join(__dirname, '../..', logoConfig.path.replace('/', ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      
      // 刪除配置
      fs.unlinkSync(configPath);
      
      console.log('Logo已刪除');
    }
    
    res.json({
      success: true,
      message: 'Logo已刪除'
    });
    
  } catch (error) {
    console.error('Logo刪除失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 獲取Logo文件（用於PDF生成）
const getLogoConfig = () => {
  try {
    const configPath = path.join(__dirname, '../../config/logo.json');
    
    if (fs.existsSync(configPath)) {
      const logoConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // 檢查文件是否存在
      const fullPath = path.join(__dirname, '../..', logoConfig.path.replace('/', ''));
      if (fs.existsSync(fullPath)) {
        return {
          enabled: logoConfig.enabled,
          path: fullPath
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('獲取Logo配置失敗:', error);
    return null;
  }
};

module.exports = router;
module.exports.getLogoConfig = getLogoConfig;