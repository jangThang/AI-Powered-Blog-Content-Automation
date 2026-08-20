using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class StarlogLauncher
{
    [STAThread]
    private static void Main()
    {
        string projectRoot = AppDomain.CurrentDomain.BaseDirectory;
        string launcherScript = Path.Combine(projectRoot, "launcher", "launch.ps1");

        if (!File.Exists(launcherScript))
        {
            MessageBox.Show(
                "내부 실행 파일을 찾지 못했습니다. Starlog.exe를 프로젝트 폴더 안에 두어주세요.",
                "Starlog AI",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        try
        {
            string powershell = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.System),
                "WindowsPowerShell",
                "v1.0",
                "powershell.exe");
            var startInfo = new ProcessStartInfo
            {
                FileName = powershell,
                Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + launcherScript + "\"",
                WorkingDirectory = projectRoot,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            Process.Start(startInfo);
        }
        catch (Exception error)
        {
            MessageBox.Show(
                "Starlog AI를 시작하지 못했습니다.\r\n\r\n" + error.Message,
                "Starlog AI",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }
}
