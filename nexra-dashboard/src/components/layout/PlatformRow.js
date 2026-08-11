import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton } from '../ui/index.js';
import { useAuth } from '../../context/index.js';

export const PlatformRow = ({ label, value, icon }