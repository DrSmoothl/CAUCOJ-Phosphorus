#!/usr/bin/env node

// 测试 Phosphorus 后端连接的简单脚本
const fetch = require('node-fetch');

const PHOSPHORUS_API_BASE = 'http://localhost:8000';

async function testBackendConnection() {
    console.log('🧪 测试 Phosphorus 后端连接...');
    console.log(`📡 API 地址: ${PHOSPHORUS_API_BASE}`);
    
    try {
        // 测试健康检查端点
        console.log('\n1️⃣ 测试健康检查端点...');
        const healthResponse = await fetch(`${PHOSPHORUS_API_BASE}/health`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ 健康检查成功');
            console.log('📊 响应数据:', JSON.stringify(healthData, null, 2));
        } else {
            console.log(`❌ 健康检查失败: HTTP ${healthResponse.status}`);
            return;
        }
        
        // 测试抄袭检测端点（模拟请求）
        console.log('\n2️⃣ 测试抄袭检测端点...');
        const testData = {
            contest_id: 'test-contest-id',
            min_tokens: 9,
            similarity_threshold: 0.0
        };
        
        const plagiarismResponse = await fetch(
            `${PHOSPHORUS_API_BASE}/api/v1/contest/plagiarism`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            }
        );
        
        console.log(`📡 抄袭检测端点响应: HTTP ${plagiarismResponse.status}`);
        
        if (plagiarismResponse.status === 422 || plagiarismResponse.status === 400) {
            console.log('✅ 端点正常响应 (预期的验证错误)');
            const errorData = await plagiarismResponse.json();
            console.log('📋 错误详情:', JSON.stringify(errorData, null, 2));
        } else if (plagiarismResponse.status === 200) {
            console.log('✅ 端点正常响应');
            const successData = await plagiarismResponse.json();
            console.log('📊 成功数据:', JSON.stringify(successData, null, 2));
        } else {
            console.log('⚠️ 端点响应异常');
            const responseText = await plagiarismResponse.text();
            console.log('📋 响应内容:', responseText);
        }
        
        // 测试获取结果端点
        console.log('\n3️⃣ 测试获取结果端点...');
        const resultsResponse = await fetch(
            `${PHOSPHORUS_API_BASE}/api/v1/contest/test-contest-id/plagiarism`
        );
        
        console.log(`📡 获取结果端点响应: HTTP ${resultsResponse.status}`);
        
        if (resultsResponse.ok) {
            const resultsData = await resultsResponse.json();
            console.log('✅ 获取结果成功');
            console.log('📊 结果数据:', JSON.stringify(resultsData, null, 2));
        } else {
            console.log('⚠️ 获取结果失败 (可能是预期的，因为测试比赛不存在)');
            const errorText = await resultsResponse.text();
            console.log('📋 错误内容:', errorText);
        }
        
        console.log('\n🎉 后端连接测试完成!');
        console.log('📝 总结:');
        console.log('   - Phosphorus 后端服务正在运行');
        console.log('   - API 端点可以正常访问');
        console.log('   - 插件应该可以正常工作');
        
    } catch (error) {
        console.log('\n❌ 连接测试失败:');
        console.error('🔥 错误详情:', error.message);
        console.log('\n🔧 可能的解决方案:');
        console.log('   1. 确保 Phosphorus 后端正在运行');
        console.log('   2. 检查端口 8000 是否被正确占用');
        console.log('   3. 验证防火墙设置');
        console.log('   4. 检查网络连接');
    }
}

// 运行测试
testBackendConnection();
