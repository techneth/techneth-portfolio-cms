const text = 'https://bla.supabase.co/storage/v1/object/public/blogs/test-slug/image1.jpg and some text <img src="https://bla.supabase.co/storage/v1/object/public/blogs/test-slug/image2.jpg" />';
const bucket = 'blogs';
const bucketPrefix = `/storage/v1/object/public/${bucket}/`;
const regex = new RegExp(`${bucketPrefix}([^"\\'\\s<>]+)`, 'g');

let match;
while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
        console.log(decodeURIComponent(match[1].split('?')[0]));
    }
}
