import { v4 as uuid } from "uuid";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const downloadJsonFile = async (jsonString: string) => {
  const fileName = uuid();
  // Set the HREF to a Blob representation of the data to be downloaded
  const blob = new Blob([jsonString], { type: "application/json" });
  // for Non-IE (chrome, firefox etc.)

  try {
    // create an invisible A element
    const link = document.createElement("a");
    link.style.display = "none";
    document.body.appendChild(link);

    // blob ready, download it
    link.href = await window.URL.createObjectURL(blob);
    link.download = `${fileName}.json`;

    // trigger the download by simulating click
    link.click();

    // cleanup
    window.document.body.removeChild(link);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("Error: fail to download a file.");
  }
};
