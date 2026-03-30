// ============================================
// Kimi 2.5 AI 食物识别功能 - 完整版
// ============================================

let currentAIImageBase64 = null;
const MOONSHOT_API_KEY = 'sk-pkLWsDjQvOo3hh4UKWJZUH8uzC1tRITm4O0AVhQF8kapFHU4';

function handleAIImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('请上传图片文件');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('图片大小不能超过 5MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    currentAIImageBase64 = e.target.result;
    displayAIImagePreview();
    showToast('图片上传成功，点击"开始 AI 识别"进行分析');
  };
  reader.readAsDataURL(file);
}

function displayAIImagePreview() {
  const previewImg = document.getElementById('ai-preview-image');
  const placeholder = document.getElementById('ai-upload-placeholder');
  const removeBtn = document.getElementById('ai-remove-image-btn');
  if (currentAIImageBase64) {
    previewImg.src = currentAIImageBase64;
    previewImg.style.display = 'block';
    placeholder.style.display = 'none';
    removeBtn.style.display = 'flex';
  }
}

function removeAIImage() {
  currentAIImageBase64 = null;
  const previewImg = document.getElementById('ai-preview-image');
  const placeholder = document.getElementById('ai-upload-placeholder');
  const removeBtn = document.getElementById('ai-remove-image-btn');
  const fileInput = document.getElementById('ai-food-image-input');
  previewImg.src = '';
  previewImg.style.display = 'none';
  placeholder.style.display = 'flex';
  removeBtn.style.display = 'none';
  fileInput.value = '';
  document.getElementById('ai-result-container').style.display = 'none';
}

async function analyzeFoodWithKimi() {
  if (!currentAIImageBase64) {
    showToast('请先上传食物图片');
    return;
  }
  const foodDesc = document.getElementById('food-desc').value.trim();
  const analyzeBtn = document.getElementById('ai-analyze-btn');
  const btnText = document.getElementById('ai-btn-text');
  const originalText = btnText.textContent;
  analyzeBtn.disabled = true;
  btnText.textContent = '🔮 AI 识别中...';
  
  try {
    const base64Image = currentAIImageBase64.split(',')[1];
    let userPrompt = '请识别这张图片中的食物，估算每种食物的重量（克），并计算热量。请按以下JSON格式返回：\\n{\\n  "foods": [\\n    {\\n      "name": "食物名称",\\n      "weight": 重量（克）,\\n      "calories": 热量（千卡）,\\n      "confidence": 置信度（0-1）\\n    }\\n  ],\\n  "totalCalories": 总热量,\\n  "totalWeight": 总重量\\n}';
    if (foodDesc) {
      userPrompt = '用户提供的描述：' + foodDesc + '\\n\\n' + userPrompt;
    }
    
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + MOONSHOT_API_KEY
      },
      body: JSON.stringify({
        model: 'kimi-k2.5-2026-03-05',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的营养师和食物识别专家。请仔细识别图片中的食物，估算每种食物的重量，并计算热量。请以JSON格式返回结果。'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/jpeg;base64,' + base64Image
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API 错误: ' + response.status);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    const parsedResult = parseAIResponse(aiResponse);
    displayAIResult(parsedResult);
    applyAIResultToForm();
    showToast('AI 识别完成！结果已自动填充到表单');
    
  } catch (error) {
    console.error('AI 识别错误:', error);
    showToast('识别失败: ' + error.message);
  } finally {
    analyzeBtn.disabled = false;
    btnText.textContent = originalText;
  }
}

function parseAIResponse(response) {
  try {
    const jsonMatch = response.match(/\\{[\\s\\S]*\\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        foods: parsed.foods || [],
        totalCalories: parsed.totalCalories || 0,
        totalWeight: parsed.totalWeight || 0
      };
    }
  } catch (e) {
    console.error('解析 AI 响应失败:', e);
  }
  return {
    foods: [],
    totalCalories: 0,
    totalWeight: 0
  };
}

function displayAIResult(result) {
  const container = document.getElementById('ai-result-container');
  const foodsContainer = document.getElementById('ai-detected-foods');
  const totalCaloriesEl = document.getElementById('ai-total-calories');
  
  let foodsHtml = '';
  for (let i = 0; i < result.foods.length; i++) {
    const food = result.foods[i];
    foodsHtml += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--divider);">';
    foodsHtml += '<div>';
    foodsHtml += '<div style="font-weight: 500; font-size: 14px;">' + food.name + '</div>';
    foodsHtml += '<div style="font-size: 12px; color: var(--text-secondary);">' + food.weight + 'g</div>';
    foodsHtml += '</div>';
    foodsHtml += '<div style="font-weight: 600; color: var(--primary);">' + food.calories + ' kcal</div>';
    foodsHtml += '</div>';
  }
  
  if (!foodsHtml) {
    foodsHtml = '<div style="color: var(--text-secondary); text-align: center; padding: 12px;">未能识别出食物</div>';
  }
  
  foodsContainer.innerHTML = foodsHtml;
  totalCaloriesEl.textContent = result.totalCalories;
  window.lastAIResult = result;
  container.style.display = 'block';
}

function applyAIResultToForm() {
  const result = window.lastAIResult;
  if (!result || !result.foods || result.foods.length === 0) {
    showToast('没有可应用的识别结果');
    return;
  }
  
  let foodNames = '';
  for (let i = 0; i < result.foods.length; i++) {
    if (i > 0) foodNames += ' + ';
    foodNames += result.foods[i].name;
  }
  
  let description = '';
  for (let i = 0; i < result.foods.length; i++) {
    if (i > 0) description += ', ';
    description += result.foods[i].name + ' ' + result.foods[i].weight + 'g';
  }
  
  document.getElementById('food-name').value = foodNames;
  document.getElementById('food-desc').value = description;
  document.getElementById('food-calories').value = result.totalCalories;
  
  showToast('AI 识别结果已填充到表单');
}
