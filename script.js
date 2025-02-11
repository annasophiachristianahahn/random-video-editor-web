document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ script.js is running!");

    // Verify FFmpeg.js is available
    if (typeof FFmpeg === "undefined") {
        console.error("❌ FFmpeg.js is still not available.");
        return;
    }

    console.log("✅ FFmpeg.js is available, proceeding...");

    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });

    const startButton = document.getElementById("startButton");
    const videoInput = document.getElementById("videoInput");
    const outputVideo = document.getElementById("outputVideo");

    // ✅ Debugging: Ensure button is found
    if (!startButton) {
        console.error("❌ Start button not found!");
        return;
    }

    // ✅ Debugging: Check if event fires
    startButton.addEventListener("click", async () => {
        console.log("🟢 'Start Editing' button clicked!");

        try {
            if (!ffmpeg.isLoaded()) {
                console.log("Loading FFmpeg...");
                await ffmpeg.load();
                console.log("✅ FFmpeg Loaded.");
            }

            let inputFiles = videoInput.files;
            if (inputFiles.length === 0) {
                alert("⚠️ Please select video files.");
                console.error("⚠️ No video files selected.");
                return;
            }

            console.log(`📂 Selected ${inputFiles.length} video file(s).`);

            let finalVideoLength = parseInt(document.getElementById("finalLength").value) || 30;
            let minClipPercent = parseInt(document.getElementById("minClipLength").value) || 25;
            let maxClipPercent = parseInt(document.getElementById("maxClipLength").value) || 90;

            console.log(`🎬 Final Video Length: ${finalVideoLength}s`);
            console.log(`🎞️ Min Clip Length: ${minClipPercent}%`);
            console.log(`🎞️ Max Clip Length: ${maxClipPercent}%`);

            let totalDuration = 0;
            let clipFiles = [];

            for (let i = 0; i < inputFiles.length; i++) {
                let file = inputFiles[i];
                let fileName = `input${i}.mp4`;
                ffmpeg.FS('writeFile', fileName, await fetchFile(file));

                console.log(`✅ File "${file.name}" uploaded to FFmpeg.js`);

                let probeData = await ffmpeg.run('-i', fileName);
                let durationMatch = probeData.match(/Duration:\s(\d+):(\d+):(\d+\.\d+)/);
                if (!durationMatch) {
                    console.error(`⚠️ Could not determine duration for ${fileName}`);
                    continue;
                }

                let duration = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3]);

                let minClipLength = (duration * minClipPercent) / 100;
                let maxClipLength = (duration * maxClipPercent) / 100;
                let clipLength = Math.random() * (maxClipLength - minClipLength) + minClipLength;
                let startTime = Math.random() * (duration - clipLength);

                let clipName = `clip${i}.mp4`;
                console.log(`✂️ Cutting clip from ${startTime.toFixed(2)}s to ${(startTime + clipLength).toFixed(2)}s`);

                await ffmpeg.run('-i', fileName, '-ss', `${startTime}`, '-t', `${clipLength}`, '-c', 'copy', clipName);
                clipFiles.push(clipName);

                totalDuration += clipLength;
                if (totalDuration >= finalVideoLength) break;
            }

            if (clipFiles.length === 0) {
                console.error("⚠️ No valid clips were generated.");
                return;
            }

            let concatFile = 'concat.txt';
            let concatList = clipFiles.map(name => `file '${name}'`).join('\n');
            ffmpeg.FS('writeFile', concatFile, concatList);

            console.log("🔄 Merging clips into final video...");
            await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', 'output.mp4');

            let data = ffmpeg.FS('readFile', 'output.mp4');
            let videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
            let url = URL.createObjectURL(videoBlob);
            outputVideo.src = url;
            outputVideo.style.display = 'block';

            console.log("✅ Final video generated successfully!");

        } catch (error) {
            console.error("❌ Error processing video:", error);
        }
    });
});
