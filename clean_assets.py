from PIL import Image
import os

def remove_black_bg(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        new_data = []
        for item in datas:
            # Aggressive Tolerance: If pixel is dark (R,G,B < 50), make distinct transparent
            if item[0] < 50 and item[1] < 50 and item[2] < 50:
                new_data.append((255, 255, 255, 0)) # Fully transparent
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Processed: {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

base_dir = r"C:\Users\HYPE-R\.gemini\antigravity\playground\white-orion\assets"
remove_black_bg(os.path.join(base_dir, "panglima_mu.png"), os.path.join(base_dir, "panglima_static_clean.png"))
remove_black_bg(os.path.join(base_dir, "observers.png"), os.path.join(base_dir, "observers_clean.png"))
