# Video Generation Feature - User Guide (English)

## 📌 Quick Navigation

- **First time using?** → Jump to [Step 1: Set Up API Key](#step-1-set-up-api-key)
- **Already have a key?** → Jump to [Step 2: Generate Video](#step-2-generate-video)
- **Having issues?** → Jump to [FAQ](#faq)

---

## Step 1: Set Up API Key

### 1.1 Open API Configuration Dialog

Find the **⚙️ Settings** button in the left sidebar and click to open the API configuration dialog.

```
Left Sidebar
  ↓
⚙️ Button (below the import button)
  ↓
API Configuration Dialog Opens
```

### 1.2 Get API Key

You need two pieces of information from a relay service:

| Information | Description | Example |
|-------------|-------------|---------|
| **Base URL** | API address of the relay service | `https://api.xxx.com` |
| **API Key** | Your API key | `sk-xxx...` |

**How to get it?**

1. Register an account with a relay service (e.g., [Shenma API](https://shenma.ai))
2. Log in and go to account settings
3. Find "API Configuration" or "Key Management"
4. Copy the **Base URL** and **API Key**

### 1.3 Fill in Configuration

In the API configuration dialog:

1. **Base URL Input**
   - Paste your relay service Base URL
   - Example: `https://api.xxx.com`

2. **API Key Input**
   - Paste your API key
   - Example: `sk-xxx...`

3. **Click "Test Connection" Button**
   - System will verify your configuration
   - If successful, shows ✅ Connection successful! Configuration saved
   - If failed, check if Base URL and API Key are correct

### 1.4 Configuration Saved

Configuration is automatically saved to browser local storage. You won't need to reconfigure on next visit.

---

## Step 2: Generate Video

### 2.1 Prepare Storyboard

Before generating video, prepare storyboard images on the canvas:

1. **Upload Reference Subject** (Optional)
   - Click 📥 button in left sidebar
   - Select "Upload Reference Subject"
   - Choose 1 image as reference

2. **Upload Storyboard Frames**
   - Click 📥 button in left sidebar
   - Select "Upload Storyboard Frames"
   - Choose 1-6 images as frames

3. **Select Frames**
   - Box select or Shift+click to select frames for video generation
   - Selected frames will be highlighted

### 2.2 Open Video Generation Dialog

Find the **🎬 Generate Video** button in the right sidebar and click to open the video generation dialog.

```
Right Sidebar
  ↓
🎬 Generate Video Button
  ↓
Video Generation Dialog Opens
```

### 2.3 Fill in Video Parameters

Fill in the following information in the video generation dialog:

#### Video Prompt (Required)
- Describe the video content you want to generate
- Example: `A cat running in a park with sunlight on the grass`
- Tip: The more detailed the prompt, the better the result

#### Model Selection
- **Sora 2 (Basic)** - Standard model, fast generation
- **Sora 2 Pro (Professional)** - Professional model, better quality

#### Aspect Ratio
- **Landscape (16:9)** - Recommended for movies, ads
- **Portrait (9:16)** - Recommended for short videos, mobile

#### Duration (Seconds)
- **10 seconds** - Fastest generation
- **15 seconds** - Standard duration
- **25 seconds** - Longest duration

#### HD Option (Sora 2 Pro only)
- ☐ **Enable HD** - Check to generate 1080P HD video
- ⚠️ Note: Enabling HD significantly increases generation time (8+ minutes)

### 2.4 Click "Generate" Button

After clicking the **Generate** button:

1. System submits video generation request to Sora 2 API
2. Shows "Generating..." status
3. Wait for video generation to complete

---

## Step 3: Monitor Generation Progress

### 3.1 Progress Monitoring

During generation, you'll see:

- **Progress Bar** - Shows generation progress (0% - 100%)
- **Status Info** - Shows current status (e.g., "Processing", "Generating")
- **Estimated Time** - Estimated generation time based on model and parameters

### 3.2 Expected Duration

| Configuration | Duration |
|---------------|----------|
| Standard 10s | 1-3 minutes |
| Standard 15s | 3-5 minutes |
| HD 10s | 8+ minutes |
| HD 15s | 10+ minutes |

### 3.3 Generation Complete

When generation completes:

1. Progress bar shows 100%
2. Status shows "Complete"
3. **Play** button appears
4. **Download** button appears

---

## Step 4: View and Download Video

### 4.1 Play Video

Click the **Play** button to play the generated video in the app.

### 4.2 Download Video

Click the **Download** button to save the video locally:

- File format: MP4
- File name: `video_[timestamp].mp4`
- Save location: Browser default download folder

### 4.3 Share Video

After downloading, you can:

- Upload to social media (TikTok, YouTube, etc.)
- Use in video editing projects
- Share with team members

---

## FAQ

### Q1: How do I get an API key?

**A:** 
1. Register an account with a relay service (e.g., [Shenma API](https://shenma.ai))
2. Log in and go to account settings
3. Find "API Configuration" or "Key Management"
4. Copy Base URL and API Key
5. Paste into the app's API configuration dialog

### Q2: Test connection failed, what should I do?

**A:** Check the following:

1. **Is Base URL correct?**
   - Should be a complete URL like `https://api.xxx.com`
   - Don't include paths like `/v1/videos`

2. **Is API Key correct?**
   - Should start with `sk-`
   - Check for extra spaces or line breaks

3. **Is network connection normal?**
   - Try refreshing the page and testing again

4. **Is API service available?**
   - Check if relay service is online
   - Check if your account has sufficient quota

### Q3: How long does video generation take?

**A:** Depends on the parameters you choose:

- **Standard 10s**: 1-3 minutes
- **Standard 15s**: 3-5 minutes
- **HD 10s**: 8+ minutes
- **HD 15s**: 10+ minutes

⚠️ Note: Actual time may vary due to server load.

### Q4: Generation failed with error message, what should I do?

**A:** Take action based on the error message:

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `401 Unauthorized` | Invalid API Key | Check if API Key is correct |
| `400 Bad Request` | Wrong request parameters | Check prompt and parameters |
| `429 Too Many Requests` | Too many requests | Wait a few minutes and retry |
| `Image contains real people` | Submitted image has faces | Use images without faces |
| `Prompt contains prohibited content` | Prompt violates policy | Modify prompt, avoid violence, adult content |

### Q5: My API quota is used up, what should I do?

**A:** 
1. Log in to your relay service account
2. Go to account settings and check remaining quota
3. If quota is insufficient, need to recharge or purchase more
4. After recharge, you can continue using

### Q6: Generated video quality is poor, what should I do?

**A:** Try these methods to improve:

1. **Improve the prompt**
   - More detailed prompts are better
   - Use specific descriptions like "sunlight on grass" instead of "sunlight"
   - Specify style like "cinematic", "high definition"

2. **Choose better model**
   - Use Sora 2 Pro instead of Sora 2
   - Enable HD option

3. **Adjust parameters**
   - Increase duration (15s or 25s)
   - Choose appropriate aspect ratio

4. **Use reference images**
   - Upload reference subject and storyboard frames
   - System will generate more consistent video based on references

### Q7: Can I generate multiple videos?

**A:** Yes. Each generation creates a new video task. You can:

1. Modify prompt and parameters
2. Click "Generate" button
3. Wait for new video to complete
4. Download or share

⚠️ Note: Each video generation consumes API quota.

### Q8: Can I edit the generated video?

**A:** Yes. After generation completes, you can:

1. Download video to local
2. Use video editing software (e.g., Adobe Premiere, DaVinci Resolve)
3. Add subtitles, music, effects, etc.

### Q9: Will my configuration be saved?

**A:** Yes. Configuration is saved to browser local storage and won't need reconfiguration on next visit.

⚠️ Note:
- If you clear browser cache, configuration will be deleted
- Configuration is only saved locally, not uploaded to server
- Recommend regularly backing up your API Key

### Q10: How do I reset configuration?

**A:** 
1. Open API configuration dialog (click ⚙️ button)
2. Clear Base URL and API Key input fields
3. Click "Test Connection" button
4. Configuration will be cleared

---

## Workflow Summary

```
1. Set up API key
   ↓
2. Upload storyboard frames
   ↓
3. Select frames
   ↓
4. Open video generation dialog
   ↓
5. Fill in video parameters
   ↓
6. Click "Generate" button
   ↓
7. Wait for generation to complete
   ↓
8. View and download video
```

---

## Tips and Tricks

### 💡 Prompt Writing Tips

**Good prompt example:**
```
A golden cat running in a sunny park,
green grass and blue sky in background,
camera follows the cat's movement,
cinematic quality,
vibrant colors,
soft lighting
```

**Poor prompt example:**
```
Cat in park
```

### 🎬 Parameter Selection Guide

| Scenario | Recommended Parameters |
|----------|----------------------|
| Social media short video | Portrait 9:16, 10s, Sora 2 |
| Movie trailer | Landscape 16:9, 15s, Sora 2 Pro + HD |
| Advertisement | Landscape 16:9, 10s, Sora 2 Pro |
| Demo video | Landscape 16:9, 15s, Sora 2 |

### 🔄 Batch Generate Videos

If you need to generate multiple videos:

1. Prepare multiple sets of storyboard frames
2. Write different prompts for each set
3. Generate videos one by one
4. Download and organize all videos

---

## Get Help

If you encounter issues:

1. Check the [FAQ](#faq) section of this guide
2. Check relay service documentation
3. Contact relay service technical support

---

## Changelog

### v1.0 (2024-12-24)
- Initial release
- Support for Sora 2 and Sora 2 Pro models
- Custom aspect ratio and duration support
- HD option support
- Reference and storyboard image support

---

**Enjoy using the app!** 🎉
