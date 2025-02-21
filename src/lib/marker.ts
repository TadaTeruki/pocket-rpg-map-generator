import { Place } from './features';

export type MarkerShape = {
	width_size: number; // 1-3
	height_size: number; // 1-3
	x_transform: number; // -1-1
	y_transform: number; // -1-1
};

export function createMarker(place: Place): HTMLElement {
	const el = document.createElement('div');
	el.className = 'marker';
	el.style.backgroundColor = place.category == 'city' ? '#f67070' : '#7d97f0';

	const hash = place.nameHash() & 0x7fffffff;

	let width_size = 1,
		height_size = 1;
	if (place.category == 'city') {
		[width_size, height_size] = [
			[2, 2],
			[2, 2],
			[1, 2],
			[2, 1]
		][Math.floor(4 * place.position)];
	} else {
		[width_size, height_size] = [
			[1, 2],
			[2, 1],
			[1, 1],
			[1, 1],
			[1, 1]
		][Math.floor(5 * place.position)];
	}

	let x_transform = 0,
		y_transform = 0;
	if (width_size > 1) {
		x_transform = (hash % 3) - 1;
	}
	if (height_size > 1) {
		y_transform = ((hash * 4) % 3) - 1;
	}

	const shape: MarkerShape = {
		width_size: width_size,
		height_size: height_size,
		x_transform: x_transform,
		y_transform: y_transform
	};

	el.style.width = `${15 * shape.width_size}px`;
	el.style.height = `${15 * shape.height_size}px`;
	el.style.marginLeft = `${-10 * shape.x_transform}px`;
	el.style.marginTop = `${-10 * shape.y_transform}px`;

	el.style.borderRadius = '5px';
	el.style.borderWidth = '3px';

	const lightColor = place.category == 'city' ? '#ffaba8' : '#c0d0f5';
	const darkColor = place.category == 'city' ? '#cc4547' : '#7b80c7';

	el.style.borderRightColor = darkColor;
	el.style.borderBottomColor = darkColor;
	el.style.borderLeftColor = lightColor;
	el.style.borderTopColor = lightColor;

	el.style.boxShadow = `0 0 0 3px #ffffffcc`;

	el.addEventListener('mousemove', () => {
		window.alert(place.name);
	});

	return el;
}
