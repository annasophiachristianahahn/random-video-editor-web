document.addEventListener("DOMContentLoaded", async () => {
    if (typeof FFmpeg === "undefined") {
        console.error("FFmpeg.js is not loaded! Cannot proceed.");
        return;
    }

    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });

    const startButton = document.getElementById("startButton");
    const videoInput = document.getElementById("videoInput");
    const outputVideo = document.getElementById("outputVideo");

    startButton.addEventListener("click", async () => {
        try {
            if (!ffmpeg.isLoaded()) {
                console.log("Loading FFmpeg...");
                await ffmpeg.load();
                console.log("FFmpeg Loaded.");
            }

            let inputFiles = videoInput.files;
            if (inputFiles.length === 0) {
                alert("Please select video files.");
                return;
            }

            let finalVideoLength = parseInt(document.getElementById("finalLength").value) || 30;
            let minClipPercent = parseInt(document.getElementById("minClipLength").value) || 25;
            let maxClipPercent = parseInt(document.getElementById("maxClipLength").value) || 33;

            let totalDuration = 0;
            let clipFiles = [];

            for (let i = 0; i < inputFiles.length; i++) {
                let file = inputFiles[i];
                let fileName = `input${i}.mp4`;
                ffmpeg.FS('writeFile', fileName, await fetchFile(file));

                let probeData = await ffmpeg.run('-i', fileName);
                let durationMatch = probeData.match(/Duration:\s(\d+):(\d+):(\d+\.\d+)/);
                if (!durationMatch) continue;
                let duration = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3]);

                let minClipLength = (duration * minClipPercent) / 100;
                let maxClipLength = (duration * maxClipPercent) / 100;
                let clipLength = Math.random() * (maxClipLength - minClipLength) + minClipLength;
                let startTime = Math.random() * (duration - clipLength);

                let clipName = `clip${i}.mp4`;
                await ffmpeg.run('-i', fileName, '-ss', `${startTime}`, '-t', `${clipLength}`, '-c', 'copy', clipName);
                clipFiles.push(clipName);

                totalDuration += clipLength;
                if (totalDuration >= finalVideoLength) break;
            }

            let concatFile = 'concat.txt';
            let concatList = clipFiles.map(name => `file '${name}'`).join('\n');
            ffmpeg.FS('writeFile', concatFile, concatList);
            await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', 'output.mp4');

            let data = ffmpeg.FS('readFile', 'output.mp4');
            let videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
            let url = URL.createObjectURL(videoBlob);
            outputVideo.src = url;
            outputVideo.style.display = 'block';

        } catch (error) {
            console.error("Error processing video:", error);
        }
    });
});
