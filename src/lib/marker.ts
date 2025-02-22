import { Place } from './features';

export type MarkerShape = {
	width_size: number; // 1-3
	height_size: number; // 1-3
	x_transform: number; // -1-1
	y_transform: number; // -1-1
};

export type MarkerElements = {
	level: number;
	icon: HTMLElement;
	name: HTMLElement;
};

export function createMarker(place: Place): MarkerElements {
	const icon = document.createElement('div');
	icon.className = 'marker';
	icon.style.backgroundColor = place.category == 'city' ? '#f67070' : '#7d97f0';

	const hash = place.nameHash() & 0x7fffffff;

	let city_level = Math.floor(4 * place.position);
	let town_level = Math.floor(5 * place.position);

	let width_size = 1,
		height_size = 1;
	if (place.category == 'city') {
		[width_size, height_size] = [
			[2, 2],
			[2, 2],
			[1, 2],
			[2, 1]
		][city_level];
	} else {
		[width_size, height_size] = [
			[1, 2],
			[2, 1],
			[1, 1],
			[1, 1],
			[1, 1]
		][town_level];
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

	icon.style.width = `${15 * shape.width_size}px`;
	icon.style.height = `${15 * shape.height_size}px`;
	icon.style.marginLeft = `${-10 * shape.x_transform}px`;
	icon.style.marginTop = `${-10 * shape.y_transform}px`;

	icon.style.borderRadius = '5px';
	icon.style.borderWidth = '3px';

	const lightColor = place.category == 'city' ? '#ffaba8' : '#c0d0f5';
	const darkColor = place.category == 'city' ? '#cc4547' : '#7b80c7';

	icon.style.borderRightColor = darkColor;
	icon.style.borderBottomColor = darkColor;
	icon.style.borderLeftColor = lightColor;
	icon.style.borderTopColor = lightColor;

	icon.style.boxShadow = `0 0 0 3px #ffffffcc`;

	const name = document.createElement('div');
	name.className = 'marker-name';
	name.textContent = place.name_display;

	name.style.marginLeft = `${-10 * shape.x_transform}px`;
	name.style.marginTop = `${-10 * shape.y_transform + 20}px`;

	name.style.backgroundColor = '#00005555';
	name.style.color = '#ffffff';
	name.style.fontSize = '10px';
	name.style.fontWeight = 'bold';
	name.style.padding = '1px 3px';
	name.style.borderRadius = '3px';

	return {
		level: city_level * 10000 + town_level,
		icon: icon,
		name: name
	};
}
