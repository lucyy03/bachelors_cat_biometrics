// src/utils/cloudinary.ts
//assumptions: replace the placeholders with your real cloudinary cloud name and unsigned upload preset

const CLOUDINARY_CLOUD_NAME = 'dotv1zaqm';
const CLOUDINARY_UPLOAD_PRESET = 'cats_unsigned';

export async function uploadImageToCloudinary(file: File): Promise<string> {
	const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

	const formData = new FormData();
	formData.append('file', file);
	formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

	const res = await fetch(url, {
		method: 'POST',
		body: formData
	});

	if (!res.ok) {
		throw new Error('image upload failed');
	}

	const data = await res.json();
	//secure_url is the https url of your uploaded image
	return data.secure_url as string;
}