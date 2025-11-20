# Ollama Performance Optimization Guide

## Overview
This guide provides recommendations for optimizing Ollama performance on a VPS with 16GB RAM.

## Implemented Optimizations

### 1. **Message Limiting**
- **What**: Limit the number of messages analyzed per conversation
- **Why**: Reduces prompt size, which directly impacts processing time and memory usage
- **Configuration**: `MAX_MESSAGES_FOR_ANALYSIS` (default: 50 messages)
- **Impact**: Smaller prompts = faster inference

### 2. **Request Timeout**
- **What**: Added configurable timeout for Ollama requests
- **Why**: Prevents requests from hanging indefinitely
- **Configuration**: `OLLAMA_TIMEOUT` (default: 60000ms / 60 seconds)
- **Impact**: Better error handling and resource management

### 3. **Optimized Model Parameters**
The following parameters have been added to reduce inference time:

```typescript
options: {
  num_ctx: 4096,        // Reduced context window (from default 8192+)
  num_predict: 1024,    // Limit max tokens to generate
  temperature: 0.7,     // Slightly lower for more focused responses
  top_p: 0.9,
  top_k: 40,
  num_thread: 4,        // Adjust based on your VPS CPU cores
}
```

- **num_ctx**: Smaller context window = less memory usage
- **num_predict**: Limits response length = faster generation
- **num_thread**: Adjust to match your VPS CPU cores (check with `nproc` command)

### 4. **Parallel Processing with Concurrency Control**
- **What**: Process multiple conversations simultaneously (3 at a time)
- **Why**: Reduces total processing time while preventing server overload
- **Configuration**: Hardcoded to 3 concurrent analyses (can be made configurable)
- **Impact**: ~3x faster cron job execution

### 5. **Configurable Ollama Host**
- **What**: Allow connection to remote Ollama instance
- **Why**: You can offload AI processing to a dedicated server
- **Configuration**: `OLLAMA_HOST` (default: http://localhost:11434)

## Environment Variables

Add these to your `.env` file:

```bash
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT=60000
MAX_MESSAGES_FOR_ANALYSIS=50
```

### Recommended Values for 16GB VPS:

```bash
# Conservative settings for limited resources
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT=90000              # 90 seconds for slower hardware
MAX_MESSAGES_FOR_ANALYSIS=30      # Reduce to 30 for faster processing
```

## Additional Optimization Recommendations

### 1. **Use a Smaller/Faster Model**

DeepSeek-LLM is a large model. Consider switching to a smaller, faster model:

**Recommended alternatives:**
- `mistral:7b` - Good balance of speed and quality
- `llama3.2:3b` - Very fast, smaller model
- `phi3:mini` - Optimized for limited resources
- `gemma2:2b` - Smallest, fastest option

**To change the model**, update line 135 in `ollama.service.ts`:
```typescript
model: 'mistral:7b',  // Instead of 'deepseek-llm'
```

**Pull the model first:**
```bash
ollama pull mistral:7b
```

### 2. **Optimize Ollama Server Settings**

Create/edit `~/.ollama/config.json` or set environment variables:

```bash
# Limit concurrent requests
OLLAMA_MAX_LOADED_MODELS=1

# Reduce memory usage
OLLAMA_NUM_PARALLEL=1

# Set GPU layers (if you have GPU, set to 0 for CPU-only)
OLLAMA_NUM_GPU=0
```

### 3. **Model Quantization**

Use quantized models for faster inference:
- `mistral:7b-q4_0` - 4-bit quantization (faster, less accurate)
- `mistral:7b-q5_K_M` - 5-bit quantization (balanced)

Example:
```bash
ollama pull mistral:7b-q4_0
```

### 4. **System-Level Optimizations**

**a) Increase swap space** (if you have limited RAM):
```bash
# Check current swap
free -h

# Create 4GB swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**b) Adjust Ollama memory settings**:
```bash
# In your systemd service or startup script
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_KEEP_ALIVE=5m  # Unload model after 5 minutes of inactivity
```

**c) Monitor resource usage**:
```bash
# Install htop for better monitoring
sudo apt install htop

# Monitor while running
htop
```

### 5. **Database Query Optimization**

The message retrieval query is already optimized with:
- Index on `chatId` and `sessionId`
- Limit on number of messages
- Efficient sorting

Ensure you have proper indexes:
```javascript
// In your schema file, ensure these indexes exist:
@Schema()
export class WhatsAppMessage {
  @Prop({ required: true, index: true })
  chatId: string;

  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  timestamp: number;
}
```

### 6. **Caching Strategy** (Future Enhancement)

Consider implementing caching for:
- Project configurations (avoid repeated API calls)
- Recent analysis results (avoid re-analyzing unchanged conversations)

Example implementation:
```typescript
// Add to OllamaService
private analysisCache = new Map<string, { result: any; timestamp: number }>();
private cacheTimeout = 3600000; // 1 hour

async analyzeConversation(...) {
  const cacheKey = `${chatId}-${sessionId}`;
  const cached = this.analysisCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
    this.logger.log(`Using cached analysis for ${chatId}`);
    return cached.result;
  }
  
  // ... perform analysis ...
  
  this.analysisCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}
```

## Performance Monitoring

### Check Ollama Performance

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Monitor Ollama logs
journalctl -u ollama -f

# Or if running manually
tail -f ~/.ollama/logs/server.log
```

### Application Logs

Monitor your NestJS application logs to see:
- Request duration: `Ollama request completed in XXXms`
- Message counts: `Retrieved XX messages for chat`
- Timeout issues: `Ollama request timeout after XXXms`

## Troubleshooting

### Issue: Requests still taking too long

**Solutions:**
1. Reduce `MAX_MESSAGES_FOR_ANALYSIS` to 20-30
2. Switch to a smaller model (mistral:7b or phi3:mini)
3. Reduce `num_ctx` to 2048
4. Reduce `num_predict` to 512
5. Check if Ollama is using CPU instead of GPU (expected on VPS)

### Issue: Out of memory errors

**Solutions:**
1. Use a smaller model
2. Reduce `num_ctx` to 2048 or lower
3. Set `OLLAMA_MAX_LOADED_MODELS=1`
4. Add swap space
5. Reduce concurrency limit in cron job to 1 or 2

### Issue: Timeouts

**Solutions:**
1. Increase `OLLAMA_TIMEOUT` to 120000 (2 minutes)
2. Use a faster model
3. Reduce message count
4. Check server load with `htop`

## Benchmarking

To measure improvements, add timing logs:

```typescript
// Already implemented in the code:
const startTime = Date.now();
// ... ollama call ...
const elapsedTime = Date.now() - startTime;
this.logger.log(`Ollama request completed in ${elapsedTime}ms`);
```

Monitor these logs to see if optimizations are working.

## Recommended Configuration for 16GB VPS

```bash
# .env file
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT=90000
MAX_MESSAGES_FOR_ANALYSIS=30
```

```typescript
// ollama.service.ts - line 135
model: 'mistral:7b-q4_0',  // Faster than deepseek-llm

// ollama.service.ts - options
options: {
  num_ctx: 2048,      // Reduced from 4096
  num_predict: 512,   // Reduced from 1024
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  num_thread: 4,      // Adjust based on CPU cores
}
```

```typescript
// conversations.service.ts - line 203
const concurrencyLimit = 2;  // Reduced from 3 for lower-spec VPS
```

## Next Steps

1. **Add environment variables** to your `.env` file
2. **Test with current model** to see improvement
3. **Consider switching to a smaller model** if still slow
4. **Monitor logs** to identify bottlenecks
5. **Adjust parameters** based on your specific use case

## Expected Performance Improvements

With these optimizations:
- **30-50% faster** inference with reduced context and prediction limits
- **~3x faster** cron job execution with parallel processing
- **Better reliability** with timeout handling
- **Reduced memory usage** with message limiting

Switching to a smaller model like `mistral:7b-q4_0` could provide:
- **2-5x faster** inference compared to deepseek-llm
- **50-70% less memory** usage
